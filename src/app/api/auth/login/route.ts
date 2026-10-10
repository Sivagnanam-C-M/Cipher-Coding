import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import Admin from '@/models/Admin';
import { LoginSchema } from '@/lib/validation';
import { verifyPassword } from '@/lib/auth/password';
import { setAuthCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please provide valid credentials.' },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;
    const cleanId = identifier.trim();

    await connectToDatabase();

    // 1. Try participant lookup by direct index (email vs participantCode)
    const isEmail = cleanId.includes('@');
    const participantQuery = isEmail
      ? { email: cleanId.toLowerCase() }
      : { participantCode: cleanId.toUpperCase() };

    const participant = await Participant.findOne(participantQuery)
      .select('+passwordHash')
      .lean();

    if (participant) {
      const isValid = await verifyPassword(password, participant.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid identification credentials.' },
          { status: 401 }
        );
      }

      const response = NextResponse.json({
        success: true,
        user: {
          id: participant._id.toString(),
          name: participant.name,
          email: participant.email,
          participantCode: participant.participantCode,
          role: 'participant',
        },
        redirectTo: '/mission',
      });

      return await setAuthCookie(response, {
        userId: participant._id.toString(),
        role: 'participant',
        email: participant.email,
        name: participant.name,
        participantCode: participant.participantCode,
        preferredLanguage: participant.preferredLanguage || 'python',
      });
    }

    // Check if an admin credential was mistakenly entered on the participant login form
    const admin = await Admin.findOne({
      $or: [{ email: cleanId.toLowerCase() }, { username: cleanId.toLowerCase() }],
    });

    if (admin) {
      return NextResponse.json(
        { error: 'Administrative personnel must authenticate separately at /admin/login.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Operative profile not found. Please verify your Participant ID or email.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('[API /api/auth/login] Error:', error);
    return NextResponse.json(
      { error: 'Authentication service encountered an error.' },
      { status: 500 }
    );
  }
}
