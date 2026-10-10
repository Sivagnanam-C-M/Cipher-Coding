import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import EventSession from '@/models/EventSession';
import Question from '@/models/Question';
import ParticipantProgress from '@/models/ParticipantProgress';

export async function GET() {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    await connectToDatabase();

    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const registeredCount = await Participant.countDocuments();
    const activeCount = await EventSession.countDocuments({
      eventId: event._id,
      status: 'active',
    });
    const completedCount = await EventSession.countDocuments({
      eventId: event._id,
      status: 'completed',
    });
    const totalQuestions = await Question.countDocuments({ eventId: event._id });

    // Calculate average score across all registered participants
    const scoreAgg = await ParticipantProgress.aggregate([
      { $match: { eventId: event._id } },
      { $group: { _id: '$participantId', total: { $sum: '$pointsEarned' } } },
    ]);

    const totalScoresSum = scoreAgg.reduce((sum, item) => sum + item.total, 0);
    const averageScore = registeredCount > 0 ? Math.round(totalScoresSum / registeredCount) : 0;

    return NextResponse.json({
      success: true,
      overview: {
        eventName: event.name,
        status: event.status,
        durationMinutes: event.durationMinutes,
        progressionMode: event.progressionMode,
        leaderboardEnabled: event.leaderboardEnabled,
        maxAttempts: event.maxAttempts,
        registeredCount,
        activeCount,
        completedCount,
        averageScore,
        totalQuestions,
      },
    });
  } catch (error: any) {
    console.error('[API /api/admin/overview] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve admin telemetry' }, { status: 500 });
  }
}
