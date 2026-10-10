import { NextRequest, NextResponse } from 'next/server';
import { getParticipantSession, setAuthCookie } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import EventSession from '@/models/EventSession';
import Participant from '@/models/Participant';
import Question from '@/models/Question';
import ParticipantProgress from '@/models/ParticipantProgress';
import { evaluateSessionTimer } from '@/lib/timer';

export async function POST(req: NextRequest) {
  try {
    const authSession = await getParticipantSession();
    if (!authSession || authSession.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized participant' }, { status: 401 });
    }

    let preferredLanguage: 'python' | 'java' | 'c' | 'cpp' | undefined = undefined;
    try {
      const body = await req.json();
      if (
        body?.preferredLanguage &&
        ['python', 'java', 'c', 'cpp'].includes(body.preferredLanguage)
      ) {
        preferredLanguage = body.preferredLanguage;
      }
    } catch {
      // Body not provided or not JSON
    }

    await connectToDatabase();

    // 1. Fetch Event and update preferred language concurrently
    const [event] = await Promise.all([
      Event.findOne({ slug: 'operation-zero-day' }).lean(),
      preferredLanguage
        ? Participant.findByIdAndUpdate(authSession.userId, { preferredLanguage }).exec()
        : Promise.resolve(null),
    ]);

    if (!event) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    if (event.status === 'draft') {
      return NextResponse.json(
        { error: 'EVENT NOT ACTIVE: Operation is currently in draft mode.' },
        { status: 400 }
      );
    }
    if (event.status === 'paused') {
      return NextResponse.json(
        { error: 'EVENT PAUSED: Operation has been temporarily paused by command.' },
        { status: 400 }
      );
    }
    if (event.status === 'ended') {
      return NextResponse.json(
        { error: 'EVENT ENDED: The investigation window has closed.' },
        { status: 400 }
      );
    }

    // 2. Fetch Session, Questions, and Progress in parallel
    const [existingSession, questions, progressRecords] = await Promise.all([
      EventSession.findOne({
        participantId: authSession.userId,
        eventId: event._id,
      }),
      Question.find({ eventId: event._id, isPublished: true })
        .sort({ questionNumber: 1 })
        .select('-correctAnswer -explanation')
        .lean(),
      ParticipantProgress.find({
        participantId: authSession.userId,
        eventId: event._id,
      }).lean(),
    ]);

    let session = existingSession;
    if (!session) {
      session = new EventSession({
        participantId: authSession.userId,
        eventId: event._id,
      });
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'MISSION COMPLETED: The challenge has already concluded.' },
        { status: 400 }
      );
    }

    // Set server-authoritative timestamps if not already started
    if (session.status === 'not_started' || session.status === 'not_attended' || !session.expiresAt) {
      const now = new Date();
      const durationMs = (event.durationMinutes || 40) * 60 * 1000;
      session.startedAt = now;
      session.expiresAt = new Date(now.getTime() + durationMs);
      session.status = 'active';
      await session.save();
    }

    const timer = evaluateSessionTimer(session);

    // Format questions
    const progressMap = new Map<string, any>();
    progressRecords.forEach((p: any) => {
      progressMap.set(p.questionId.toString(), p);
    });

    const isSequential = event.progressionMode === 'sequential';
    let previousSolved = true;

    const formattedQuestions = questions.map((q: any) => {
      const p = progressMap.get(q._id.toString());
      const isSolved = p?.status === 'solved';

      let isLocked = false;
      if (isSequential) {
        if (!previousSolved) isLocked = true;
        if (!isSolved) previousSolved = false;
      }

      return {
        id: q._id.toString(),
        questionNumber: q.questionNumber,
        title: q.title,
        section: q.section,
        points: q.points,
        difficulty: q.difficulty,
        isFinal: q.isFinal,
        isSolved,
        isLocked,
        attempts: p?.attempts || 0,
        status: isSolved ? 'solved' : isLocked ? 'locked' : (p?.status || 'available'),
      };
    });

    // Prepare complete first question details for instant transition caching
    const firstQ = questions[0];
    const userLang = preferredLanguage || authSession.preferredLanguage || 'python';
    let firstQuestionData: any = null;
    if (firstQ) {
      const nextQ = questions[1];
      const rawBlocks = firstQ.codeBlocks || {};
      const codeBlocks = {
        python: rawBlocks.python || firstQ.codeBlock || '',
        java: rawBlocks.java || '',
        c: rawBlocks.c || '',
        cpp: rawBlocks.cpp || '',
      };
      const p0 = progressMap.get(firstQ._id.toString());
      firstQuestionData = {
        id: firstQ._id.toString(),
        questionNumber: firstQ.questionNumber,
        title: firstQ.title,
        section: firstQ.section,
        storyText: firstQ.storyText,
        storyReveal: firstQ.storyReveal || '',
        nextQuestionId: nextQ?._id?.toString() || null,
        nextQuestionNumber: nextQ?.questionNumber || null,
        codeBlock: codeBlocks[userLang as keyof typeof codeBlocks] || firstQ.codeBlock || '',
        codeBlocks,
        preferredLanguage: userLang,
        questionText: firstQ.questionText,
        answerType: firstQ.answerType,
        points: firstQ.points,
        difficulty: firstQ.difficulty,
        hint: firstQ.hint,
        isFinal: firstQ.isFinal,
        isSolved: p0?.status === 'solved',
        attempts: p0?.attempts || 0,
        maxAttempts: event.maxAttempts,
      };
    }

    const totalScore = progressRecords.reduce((acc: number, p: any) => acc + (p.pointsEarned || 0), 0);
    const solvedCount = progressRecords.filter((p: any) => p.status === 'solved').length;

    const response = NextResponse.json({
      success: true,
      message: 'Investigation protocol initiated.',
      firstQuestionId: firstQ?._id?.toString() || formattedQuestions[0]?.id || null,
      firstQuestionData,
      event: {
        id: event._id.toString(),
        name: event.name,
        status: event.status,
        durationMinutes: event.durationMinutes,
        progressionMode: event.progressionMode,
        maxAttempts: event.maxAttempts,
        leaderboardEnabled: event.leaderboardEnabled,
      },
      session: {
        id: session._id.toString(),
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        completedAt: session.completedAt,
        tabSwitchCount: session.tabSwitchCount ?? 0,
        maxTabSwitches: session.maxTabSwitches ?? 4,
        endReason: session.endReason ?? null,
      },
      timer,
      score: totalScore,
      solvedCount,
      questions: formattedQuestions,
      preferredLanguage,
    });

    if (preferredLanguage) {
      return await setAuthCookie(response, {
        ...authSession,
        preferredLanguage,
      });
    }

    return response;
  } catch (error: any) {
    console.error('[API /api/mission/start] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate mission protocol.' },
      { status: 500 }
    );
  }
}
