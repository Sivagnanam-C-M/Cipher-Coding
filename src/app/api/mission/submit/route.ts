import { NextRequest, NextResponse } from 'next/server';
import { getParticipantSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import { getCachedEvent } from '@/lib/eventCache';
import { getCachedQuestionForSubmission } from '@/lib/questionCache';
import Submission from '@/models/Submission';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import { SubmitAnswerSchema } from '@/lib/validation';
import { evaluateSessionTimer } from '@/lib/timer';
import { validateAnswer } from '@/lib/scoring';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate Authentication
    const authSession = await getParticipantSession();
    if (!authSession || authSession.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized participant' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SubmitAnswerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid submission payload' },
        { status: 400 }
      );
    }

    const { questionId, submittedAnswer } = parsed.data;

    // 2. Validate Event from in-memory cache
    const event = await getCachedEvent();
    if (!event) {
      return NextResponse.json({ error: 'Investigation event not found' }, { status: 404 });
    }

    if (event.status === 'paused') {
      return NextResponse.json(
        { error: 'EVENT PAUSED: Submissions temporarily suspended by mission control.' },
        { status: 403 }
      );
    }

    if (event.status === 'ended') {
      return NextResponse.json(
        { error: 'EVENT ENDED: The investigation window has closed.' },
        { status: 403 }
      );
    }

    // 3. Fast cached question lookup
    const cachedItem = await getCachedQuestionForSubmission(event._id, questionId);
    if (!cachedItem || !cachedItem.question) {
      return NextResponse.json(
        { error: 'EVIDENCE UNAVAILABLE: Question artifact not found.' },
        { status: 404 }
      );
    }

    const { question, nextQuestion, totalCount: totalPublished } = cachedItem;

    await connectToDatabase();

    // 4. Validate Event Session & Server-Authoritative Timer
    const session = await EventSession.findOne({
      participantId: authSession.userId,
      eventId: event._id,
    });

    if (!session || session.status === 'not_started' || session.status === 'not_attended') {
      return NextResponse.json(
        { error: 'MISSION NOT STARTED: Initiate your investigation protocol before submitting.' },
        { status: 403 }
      );
    }

    if (session.status === 'completed') {
      const reasonMsg =
        session.endReason === 'tab_switch_exceeded'
          ? 'MISSION TERMINATED: Maximum tab switches exceeded. Challenge has ended.'
          : 'MISSION COMPLETED: Your investigation has ended. No further submissions accepted.';
      return NextResponse.json({ error: reasonMsg }, { status: 403 });
    }

    const timer = evaluateSessionTimer(session);
    if (timer.isExpired || session.status === 'expired') {
      if (session.status !== 'expired') {
        session.status = 'expired';
        await session.save();
      }
      return NextResponse.json(
        { error: 'MISSION EXPIRED: The investigation window has closed. No further submissions accepted.' },
        { status: 403 }
      );
    }

    // 5. Retrieve or Create Participant Progress Record
    let progress = await ParticipantProgress.findOne({
      participantId: authSession.userId,
      eventId: event._id,
      questionId: question._id,
    });

    // Strict Idempotency: If evidence is already decoded, return existing solved state
    if (progress && progress.status === 'solved') {
      const allProgress = await ParticipantProgress.find({
        participantId: authSession.userId,
        eventId: event._id,
      }).lean();

      const totalScore = allProgress.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);
      const solvedCount = allProgress.filter((p) => p.status === 'solved').length;

      return NextResponse.json({
        success: true,
        isCorrect: true,
        message: 'EVIDENCE ALREADY DECODED: Question already solved.',
        storyReveal: question.storyReveal || '',
        nextQuestionId: nextQuestion?._id || null,
        nextQuestionNumber: nextQuestion?.questionNumber || null,
        pointsAwarded: 0,
        totalScore,
        solvedCount,
        attempts: progress.attempts,
        isCompleted: (session.status as string) === 'completed',
      });
    }

    if (!progress) {
      progress = new ParticipantProgress({
        participantId: authSession.userId,
        eventId: event._id,
        questionId: question._id,
        status: 'viewed',
        firstViewedAt: new Date(),
        attempts: 0,
        pointsEarned: 0,
      });
    }

    // 6. Check Max Attempts Constraint
    const currentAttempts = progress.attempts || 0;
    if (event.maxAttempts > 0 && currentAttempts >= event.maxAttempts && progress.status !== 'solved') {
      return NextResponse.json(
        { error: `MAX ATTEMPTS EXCEEDED: You have reached the limit of ${event.maxAttempts} attempts for this evidence.` },
        { status: 403 }
      );
    }

    // 7. Validate Submitted Answer against Server-Stored Correct Answer
    const { isCorrect, normalizedSubmitted } = validateAnswer(
      submittedAnswer,
      question.correctAnswer,
      question.answerType
    );

    const attemptNumber = currentAttempts + 1;
    progress.attempts = attemptNumber;

    let pointsAwarded = 0;

    if (isCorrect) {
      // Award points only if not previously solved
      if (progress.status !== 'solved') {
        pointsAwarded = question.points;
        progress.pointsEarned = pointsAwarded;
        progress.status = 'solved';
        progress.solvedAt = new Date();
      }
    }

    await progress.save();

    // 8 & 9. Concurrently store immutable submission log and query lean aggregate progress
    const [, allProgress] = await Promise.all([
      Submission.create({
        participantId: authSession.userId,
        eventId: event._id,
        questionId: question._id,
        submittedAnswer: normalizedSubmitted,
        isCorrect,
        pointsAwarded,
        attemptNumber,
        submittedAt: new Date(),
      }),
      ParticipantProgress.find({
        participantId: authSession.userId,
        eventId: event._id,
      })
        .select('pointsEarned status')
        .lean(),
    ]);

    const totalScore = allProgress.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);
    const solvedCount = allProgress.filter((p) => p.status === 'solved').length;

    // Check if participant has solved all published questions
    if (solvedCount >= totalPublished && session.status === 'active') {
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();
    }

    // 10. Return Secure Validation Result
    if (isCorrect) {
      return NextResponse.json({
        success: true,
        isCorrect: true,
        message: 'ACCESS GRANTED. Evidence successfully decoded.',
        storyReveal: question.storyReveal || '',
        nextQuestionId: nextQuestion?._id || null,
        nextQuestionNumber: nextQuestion?.questionNumber || null,
        pointsAwarded,
        totalScore,
        solvedCount,
        attempts: progress.attempts,
        isCompleted: session.status === 'completed',
      });
    } else {
      const attemptsRemaining =
        event.maxAttempts > 0 ? Math.max(0, event.maxAttempts - attemptNumber) : null;

      return NextResponse.json({
        success: true,
        isCorrect: false,
        message: 'ACCESS DENIED. The evidence could not be deciphered. Try again.',
        pointsAwarded: 0,
        totalScore,
        solvedCount,
        attempts: progress.attempts,
        attemptsRemaining,
      });
    }
  } catch (error: any) {
    console.error('[API /api/mission/submit] Error:', error);
    return NextResponse.json(
      { error: 'Decryption service error during submission validation.' },
      { status: 500 }
    );
  }
}
