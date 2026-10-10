import { NextResponse } from 'next/server';
import { getParticipantSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import { evaluateSessionTimer } from '@/lib/timer';

export async function POST() {
  try {
    const authSession = await getParticipantSession();
    if (!authSession || authSession.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized participant' }, { status: 401 });
    }

    await connectToDatabase();

    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const session = await EventSession.findOne({
      participantId: authSession.userId,
      eventId: event._id,
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only active sessions record tab switch penalties
    if (session.status !== 'active') {
      return NextResponse.json({
        success: true,
        ignored: true,
        status: session.status,
        tabSwitchCount: session.tabSwitchCount || 0,
        maxTabSwitches: session.maxTabSwitches || 3,
        isTerminated: session.status === 'completed' || session.status === 'expired',
      });
    }

    // Check timer expiration
    const timer = evaluateSessionTimer(session);
    if (timer.isExpired) {
      session.status = 'expired';
      await session.save();
      return NextResponse.json(
        {
          success: false,
          error: 'Session has expired.',
          isExpired: true,
          status: 'expired',
        },
        { status: 403 }
      );
    }

    const maxSwitches = session.maxTabSwitches || 3;
    const currentCount = session.tabSwitchCount || 0;
    const newCount = currentCount + 1;
    session.tabSwitchCount = newCount;

    // Retrieve current score and solved count
    const progresses = await ParticipantProgress.find({
      participantId: authSession.userId,
      eventId: event._id,
    });
    const currentScore = progresses.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);
    const solvedCount = progresses.filter((p) => p.status === 'solved').length;

    // If exceeded (more than maxSwitches allowed)
    if (newCount > maxSwitches) {
      session.status = 'completed';
      session.completedAt = new Date();
      session.endReason = 'tab_switch_exceeded';
      await session.save();

      console.warn(
        `[Proctor Alert] Participant ${authSession.participantCode || authSession.userId} exceeded tab switch limit (${newCount}/${maxSwitches}). Session ended with score ${currentScore}.`
      );

      return NextResponse.json({
        success: true,
        exceeded: true,
        isTerminated: true,
        tabSwitchCount: newCount,
        maxTabSwitches: maxSwitches,
        totalScore: currentScore,
        solvedCount,
        completedAt: session.completedAt,
        message: `TAB SWITCH LIMIT EXCEEDED (${newCount}/${maxSwitches}): Challenge terminated with current score and time.`,
      });
    }

    // Otherwise warning recorded
    await session.save();

    return NextResponse.json({
      success: true,
      exceeded: false,
      isTerminated: false,
      tabSwitchCount: newCount,
      maxTabSwitches: maxSwitches,
      remainingSwitches: maxSwitches - newCount,
      totalScore: currentScore,
      solvedCount,
      message: `Tab switch recorded: Warning ${newCount} of ${maxSwitches}.`,
    });
  } catch (error: any) {
    console.error('[API /api/mission/tab-switch] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record tab switch event.' },
      { status: 500 }
    );
  }
}
