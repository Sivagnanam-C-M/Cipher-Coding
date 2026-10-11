import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
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

async function handleUpdateParticipant(
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

    const body = await req.json().catch(() => ({}));
    const {
      name,
      email,
      college,
      participantCode,
      preferredLanguage,
      newPassword,
      sessionStatus,
      tabSwitchCount,
    } = body;

    await connectToDatabase();
    const participant = await Participant.findById(id);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // 1. Validation for Email
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
      }
      const existingEmail = await Participant.findOne({
        email: cleanEmail,
        _id: { $ne: participant._id },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: `Email "${cleanEmail}" is already registered to another operative.` },
          { status: 409 }
        );
      }
      participant.email = cleanEmail;
    }

    // 2. Validation for Participant Code
    if (participantCode !== undefined) {
      const cleanCode = String(participantCode).trim().toUpperCase();
      if (!cleanCode || cleanCode.length < 3) {
        return NextResponse.json({ error: 'Participant code must be at least 3 characters' }, { status: 400 });
      }
      const existingCode = await Participant.findOne({
        participantCode: cleanCode,
        _id: { $ne: participant._id },
      });
      if (existingCode) {
        return NextResponse.json(
          { error: `Participant code "${cleanCode}" is already assigned to another operative.` },
          { status: 409 }
        );
      }
      participant.participantCode = cleanCode;
    }

    // 3. Validation for Name
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName || cleanName.length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
      }
      participant.name = cleanName;
    }

    // 4. Validation for College
    if (college !== undefined) {
      const cleanCollege = String(college).trim();
      if (!cleanCollege) {
        return NextResponse.json({ error: 'College cannot be empty' }, { status: 400 });
      }
      participant.college = cleanCollege;
    }

    // 5. Preferred Language
    if (preferredLanguage !== undefined) {
      if (!['python', 'java', 'c', 'cpp'].includes(preferredLanguage)) {
        return NextResponse.json({ error: 'Unsupported preferred language' }, { status: 400 });
      }
      participant.preferredLanguage = preferredLanguage;
    }

    // 6. Optional password reset
    if (newPassword && typeof newPassword === 'string' && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      participant.passwordHash = await hashPassword(newPassword.trim());
    }

    await participant.save();

    // 7. Update EventSession if applicable
    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (event) {
      let session = await EventSession.findOne({
        participantId: participant._id,
        eventId: event._id,
      });

      if (!session) {
        session = new EventSession({
          participantId: participant._id,
          eventId: event._id,
          status: 'not_attended',
          tabSwitchCount: 0,
          maxTabSwitches: 3,
        });
      }

      if (tabSwitchCount !== undefined && tabSwitchCount !== null && tabSwitchCount !== '') {
        session.tabSwitchCount = Math.max(0, parseInt(String(tabSwitchCount), 10) || 0);
      }

      if (sessionStatus && ['not_attended', 'not_started', 'active', 'completed', 'expired'].includes(sessionStatus)) {
        session.status = sessionStatus;
        if (sessionStatus === 'not_attended') {
          session.startedAt = undefined;
          session.expiresAt = undefined;
          session.completedAt = undefined;
          session.endReason = undefined;
        } else if (sessionStatus === 'active') {
          if (!session.startedAt) {
            session.startedAt = new Date();
            session.expiresAt = new Date(Date.now() + 40 * 60 * 1000);
          }
          session.completedAt = undefined;
          session.endReason = undefined;
        } else if (sessionStatus === 'completed' || sessionStatus === 'expired') {
          if (!session.completedAt) {
            session.completedAt = new Date();
          }
        }
      }

      await session.save();
    }

    return NextResponse.json({
      success: true,
      message: `Operative ${participant.participantCode} (${participant.name}) updated successfully.`,
      participant: {
        id: participant._id.toString(),
        name: participant.name,
        email: participant.email,
        college: participant.college,
        participantCode: participant.participantCode,
        preferredLanguage: participant.preferredLanguage,
      },
    });
  } catch (error: any) {
    console.error('[API PATCH /api/admin/participants/[id]] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update participant' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateParticipant(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateParticipant(req, context);
}
