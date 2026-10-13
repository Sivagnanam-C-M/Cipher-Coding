import { NextRequest, NextResponse } from 'next/server';
import { getParticipantSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import { getCachedEvent } from '@/lib/eventCache';
import { getCachedPublicQuestionById } from '@/lib/questionCache';
import ParticipantProgress from '@/models/ParticipantProgress';
import EventSession from '@/models/EventSession';
import { evaluateSessionTimer } from '@/lib/timer';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authSession = await getParticipantSession();
    if (!authSession || authSession.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized participant' }, { status: 401 });
    }

    const event = await getCachedEvent();
    if (!event) {
      return NextResponse.json({ error: 'Investigation event not found' }, { status: 404 });
    }

    // High-speed cached question lookup (eliminates 3 remote DB queries)
    const cachedItem = await getCachedPublicQuestionById(event._id, id);
    if (!cachedItem || !cachedItem.question) {
      return NextResponse.json(
        { error: 'EVIDENCE UNAVAILABLE: Unable to retrieve this evidence artifact.' },
        { status: 404 }
      );
    }

    const { question, nextQuestion, priorIds } = cachedItem;

    await connectToDatabase();

    // Concurrently fetch participant session, question progress, and prior solved count in a single roundtrip
    const needsSequentialCheck = event.progressionMode === 'sequential' && priorIds.length > 0;

    const [session, existingProgress, solvedPriorCount] = await Promise.all([
      EventSession.findOne({
        participantId: authSession.userId,
        eventId: event._id,
      }).lean(),
      ParticipantProgress.findOne({
        participantId: authSession.userId,
        eventId: event._id,
        questionId: question._id,
      }).lean(),
      needsSequentialCheck
        ? ParticipantProgress.countDocuments({
            participantId: authSession.userId,
            eventId: event._id,
            questionId: { $in: priorIds },
            status: 'solved',
          })
        : Promise.resolve(0),
    ]);

    const timer = evaluateSessionTimer(session as any);
    if (!session || session.status === 'not_started' || session.status === 'not_attended') {
      return NextResponse.json(
        { error: 'EVENT NOT ACTIVE: Please initiate the investigation protocol first.' },
        { status: 403 }
      );
    }

    if (timer.isExpired) {
      return NextResponse.json(
        { error: 'MISSION EXPIRED: The investigation window has closed.' },
        { status: 403 }
      );
    }

    if (session.status === 'completed') {
      const msg =
        session.endReason === 'tab_switch_exceeded'
          ? 'MISSION TERMINATED: Maximum tab switches exceeded. Challenge has ended.'
          : 'MISSION COMPLETED: Your challenge has concluded.';
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    // Check sequential progression lock
    if (needsSequentialCheck && (solvedPriorCount as number) < priorIds.length) {
      return NextResponse.json(
        { error: 'EVIDENCE CLASSIFIED: You must decipher previous fragments first.' },
        { status: 403 }
      );
    }

    // Initialize or mark viewed if not already marked
    let attempts = 0;
    let isSolved = false;

    if (!existingProgress) {
      // Async create viewed progress without blocking critical path
      ParticipantProgress.create({
        participantId: authSession.userId,
        eventId: event._id,
        questionId: question._id,
        status: 'viewed',
        firstViewedAt: new Date(),
        attempts: 0,
        pointsEarned: 0,
      }).catch((e) => console.error('[Progress Init Error]', e));
    } else {
      attempts = existingProgress.attempts || 0;
      isSolved = existingProgress.status === 'solved';
      if (existingProgress.status === 'available') {
        ParticipantProgress.updateOne(
          { _id: existingProgress._id },
          { $set: { status: 'viewed', firstViewedAt: new Date() } }
        ).catch((e) => console.error('[Progress View Update Error]', e));
      }
    }

    const userLang = (authSession.preferredLanguage || 'python') as
      | 'python'
      | 'java'
      | 'c'
      | 'cpp';

    const rawBlocks = question.codeBlocks || {};
    const codeBlocks = {
      python: rawBlocks.python || question.codeBlock || '',
      java: rawBlocks.java || '',
      c: rawBlocks.c || '',
      cpp: rawBlocks.cpp || '',
    };
    const resolvedCodeBlock = codeBlocks[userLang] || question.codeBlock || '';

    return NextResponse.json({
      success: true,
      question: {
        id: question._id.toString(),
        questionNumber: question.questionNumber,
        title: question.title,
        section: question.section,
        storyText: question.storyText,
        storyReveal: isSolved ? (question.storyReveal || '') : '',
        nextQuestionId: nextQuestion?._id || null,
        nextQuestionNumber: nextQuestion?.questionNumber || null,
        codeBlock: resolvedCodeBlock,
        codeBlocks,
        preferredLanguage: userLang,
        questionText: question.questionText,
        answerType: question.answerType,
        points: question.points,
        difficulty: question.difficulty,
        isFinal: question.isFinal,
        isSolved,
        attempts,
        maxAttempts: event.maxAttempts,
      },
      session: session
        ? {
            id: session._id.toString(),
            status: session.status,
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            completedAt: session.completedAt,
            tabSwitchCount: session.tabSwitchCount ?? 0,
            maxTabSwitches: session.maxTabSwitches ?? 3,
            endReason: session.endReason ?? null,
          }
        : null,
      timer,
    });
  } catch (error: any) {
    console.error('[API /api/mission/questions/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Evidence retrieval service encountered an error.' },
      { status: 500 }
    );
  }
}
