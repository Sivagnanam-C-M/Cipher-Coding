import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import Submission from '@/models/Submission';

export async function POST() {
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

    // 1. Reset all event sessions to not_attended and wipe timer stamps
    const sessionResult = await EventSession.updateMany(
      { eventId: event._id },
      {
        $set: {
          status: 'not_attended',
          tabSwitchCount: 0,
        },
        $unset: {
          startedAt: 1,
          expiresAt: 1,
          completedAt: 1,
          endReason: 1,
        },
      }
    );

    // 2. Clear progress records and submissions for clean slate
    await ParticipantProgress.deleteMany({ eventId: event._id });
    await Submission.deleteMany({ eventId: event._id });

    return NextResponse.json({
      success: true,
      message: 'All contestant statuses have been set to NOT ATTENDED.',
      modifiedSessions: sessionResult.modifiedCount,
    });
  } catch (error: any) {
    console.error('[API /api/admin/participants/reset-all] Error:', error);
    return NextResponse.json({ error: 'Failed to reset contestant statuses' }, { status: 500 });
  }
}
