import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import Event from '@/models/Event';
import EventSession from '@/models/EventSession';
import { RegisterSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth/password';
import { generateUniqueParticipantCode } from '@/lib/participantCode';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { name, email, college, password, preferredLanguage } = parsed.data;

    await connectToDatabase();

    const cleanEmail = email.toLowerCase().trim();

    // Concurrently fetch event status, check existing email, generate code, and hash password
    const [defaultEvent, existingParticipant, participantCode, passwordHash] = await Promise.all([
      Event.findOne({ slug: 'operation-zero-day' }).select('_id status').lean(),
      Participant.findOne({ email: cleanEmail }).select('_id').lean(),
      generateUniqueParticipantCode(),
      hashPassword(password),
    ]);

    // Check if event allows registration
    if (defaultEvent && defaultEvent.status === 'ended') {
      return NextResponse.json(
        { error: 'Registration for this operation has ended.' },
        { status: 403 }
      );
    }

    // Check existing email
    if (existingParticipant) {
      return NextResponse.json(
        { error: 'A participant with this email is already registered.' },
        { status: 409 }
      );
    }

    const participant = await Participant.create({
      name,
      email: cleanEmail,
      college,
      participantCode,
      preferredLanguage: preferredLanguage || 'python',
      passwordHash,
    });

    // If an active/default event exists, initialize the participant's session placeholder
    if (defaultEvent) {
      await EventSession.create({
        participantId: participant._id,
        eventId: defaultEvent._id,
        status: 'not_attended',
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful.',
        participantCode: participant.participantCode,
        name: participant.name,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/auth/register] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
