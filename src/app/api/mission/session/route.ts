import { NextResponse } from 'next/server';
import { getParticipantSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import { getCachedEvent } from '@/lib/eventCache';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import { evaluateSessionTimer } from '@/lib/timer';

export async function GET() {
  try {
    const authSession = await getParticipantSession();
    if (!authSession || authSession.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized participant' }, { status: 401 });
    }

    const event = await getCachedEvent();
    if (!event) {
      return NextResponse.json({ error: 'Investigation event not found' }, { status: 404 });
    }

    await connectToDatabase();

    // Concurrently fetch session and progress in parallel with lean queries
    const [existingSession, progresses] = await Promise.all([
      EventSession.findOne({
        participantId: authSession.userId,
        eventId: event._id,
      }),
      ParticipantProgress.find({
        participantId: authSession.userId,
        eventId: event._id,
      })
        .select('pointsEarned status')
        .lean(),
    ]);

    let session = existingSession;
    if (!session) {
      session = await EventSession.create({
        participantId: authSession.userId,
        eventId: event._id,
        status: 'not_attended',
      });
    }

    // Evaluate timer
    const timer = evaluateSessionTimer(session);

    // If timer ran out and session was active, persist expired status
    if (timer.isExpired && session.status === 'active') {
      session.status = 'expired';
      await session.save();
    }

    // Calculate participant total score and solved count
    const totalScore = progresses.reduce((acc, p) => acc + (p.pointsEarned || 0), 0);
    const solvedCount = progresses.filter((p) => p.status === 'solved').length;

    return NextResponse.json({
      success: true,
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
      user: {
        id: authSession.userId,
        name: authSession.name,
        email: authSession.email,
        participantCode: authSession.participantCode,
        preferredLanguage: authSession.preferredLanguage || 'python',
      },
    });
  } catch (error: any) {
    console.error('[API /api/mission/session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve mission session telemetry.' },
      { status: 500 }
    );
  }
}
