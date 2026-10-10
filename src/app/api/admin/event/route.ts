import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import { EventUpdateSchema } from '@/lib/validation';
import { invalidateCachedEvent } from '@/lib/eventCache';

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

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('[API GET /api/admin/event] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve event configuration' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = EventUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid configuration payload' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Apply updates
    Object.assign(event, parsed.data);

    // If starting event (status live), set startTime if not already set
    if (parsed.data.status === 'live' && !event.startTime) {
      event.startTime = new Date();
    }
    if (parsed.data.status === 'ended' && !event.endTime) {
      event.endTime = new Date();
    }

    await event.save();
    invalidateCachedEvent();

    return NextResponse.json({
      success: true,
      message: 'Event parameters updated successfully.',
      event,
    });
  } catch (error: any) {
    console.error('[API PATCH /api/admin/event] Error:', error);
    return NextResponse.json({ error: 'Failed to update event configuration' }, { status: 500 });
  }
}
