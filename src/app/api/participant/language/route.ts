import { NextRequest, NextResponse } from 'next/server';
import { getParticipantSession, setAuthCookie } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { LanguageUpdateSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const authSession = await getParticipantSession();
    if (!authSession || authSession.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized participant' }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = LanguageUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid language selection. Supported: python, java, c, cpp' },
        { status: 400 }
      );
    }

    const { preferredLanguage } = parseResult.data;

    await connectToDatabase();

    const participant = await Participant.findByIdAndUpdate(
      authSession.userId,
      { preferredLanguage },
      { new: true }
    );

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Return response with updated auth cookie reflecting new preferred language
    const response = NextResponse.json({
      success: true,
      preferredLanguage: participant.preferredLanguage,
    });

    return await setAuthCookie(response, {
      ...authSession,
      preferredLanguage: participant.preferredLanguage,
    });
  } catch (error: any) {
    console.error('[API /api/participant/language] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferred language.' },
      { status: 500 }
    );
  }
}
