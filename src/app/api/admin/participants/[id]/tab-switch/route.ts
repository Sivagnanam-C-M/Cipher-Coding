import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import EventSession from '@/models/EventSession';

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
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });
    }

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const participant = await Participant.findById(id);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'reduce'; // 'reduce' | 'set' | 'reset'
    const delta = typeof body.delta === 'number' ? body.delta : -1;
    const value = typeof body.value === 'number' ? body.value : 0;

    let session = await EventSession.findOne({
      participantId: participant._id,
      eventId: event._id,
    });

    if (!session) {
      // Create session record if not found
      session = new EventSession({
        participantId: participant._id,
        eventId: event._id,
        status: 'not_attended',
        tabSwitchCount: 0,
        maxTabSwitches: 3,
      });
    }

    const currentCount = session.tabSwitchCount || 0;
    let newCount = currentCount;

    if (action === 'reset') {
      newCount = 0;
    } else if (action === 'set') {
      newCount = Math.max(0, Math.floor(value));
    } else {
      // default: reduce
      newCount = Math.max(0, currentCount + delta);
    }

    session.tabSwitchCount = newCount;

    const maxSwitches = session.maxTabSwitches || 3;
    let reactivated = false;

    // If participant was terminated due to tab switch limit and count is now below the ceiling, reactivate them
    if (
      session.status === 'completed' &&
      session.endReason === 'tab_switch_exceeded' &&
      newCount < maxSwitches
    ) {
      session.status = 'active';
      session.endReason = undefined;
      session.completedAt = undefined;
      reactivated = true;

      // Ensure operative has active time if their countdown lapsed while locked out
      const now = new Date();
      if (!session.expiresAt || session.expiresAt <= now) {
        session.expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins restore grace
      }
    }

    await session.save();

    return NextResponse.json({
      success: true,
      tabSwitchCount: newCount,
      sessionStatus: session.status,
      reactivated,
      message: `Tab switches for ${participant.participantCode} (${participant.name}) updated to ${newCount}.${
        reactivated ? ' Session reactivated!' : ''
      }`,
    });
  } catch (error: any) {
    console.error('[API POST /api/admin/participants/[id]/tab-switch] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update participant tab switches' },
      { status: 500 }
    );
  }
}
