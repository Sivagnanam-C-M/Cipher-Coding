import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import Submission from '@/models/Submission';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });
    }

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const participant = await Participant.findById(id).select('-password');
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const session = await EventSession.findOne({
      participantId: participant._id,
      eventId: event._id,
    });

    const progress = await ParticipantProgress.find({
      participantId: participant._id,
      eventId: event._id,
    });

    return NextResponse.json({
      success: true,
      participant,
      session,
      progressCount: progress.length,
    });
  } catch (error: any) {
    console.error('[API GET /api/admin/participants/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve participant' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'reset_progress') {
      // Forward to reset logic
      await connectToDatabase();
      const event = await Event.findOne({ slug: 'operation-zero-day' });
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

      const participant = await Participant.findById(id);
      if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

      await EventSession.findOneAndUpdate(
        { participantId: participant._id, eventId: event._id },
        {
          $set: { status: 'not_attended', tabSwitchCount: 0 },
          $unset: { startedAt: 1, expiresAt: 1, completedAt: 1, endReason: 1 },
        }
      );
      await ParticipantProgress.deleteMany({ participantId: participant._id, eventId: event._id });
      await Submission.deleteMany({ participantId: participant._id, eventId: event._id });

      return NextResponse.json({
        success: true,
        message: `Progress for ${participant.participantCode} reset to NOT ATTENDED.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('[API POST /api/admin/participants/[id]] Error:', error);
    return NextResponse.json({ error: error?.message || 'Action failed' }, { status: 500 });
  }
}
