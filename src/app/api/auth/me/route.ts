import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, getParticipantSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import Admin from '@/models/Admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedRole = searchParams.get('role');
    const participantCode =
      req.headers.get('x-participant-code') || searchParams.get('participantCode') || undefined;
    const referer = req.headers.get('referer') || '';

    // 1. Admin identity is strictly returned ONLY when explicitly requested or inside /admin
    const isAdminDomain =
      requestedRole === 'admin' ||
      (referer.includes('/admin') && requestedRole !== 'participant');

    if (isAdminDomain) {
      const adminSession = await getAdminSession();
      if (adminSession) {
        return NextResponse.json(
          {
            authenticated: true,
            user: {
              id: adminSession.userId,
              username: adminSession.name || 'admin',
              email: adminSession.email,
              role: 'admin',
            },
          },
          { headers: NO_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Participant session: instant return from verified cryptographic token if populated
    const partSession = await getParticipantSession(participantCode);
    if (partSession) {
      if (partSession.name && partSession.participantCode) {
        return NextResponse.json(
          {
            authenticated: true,
            user: {
              id: partSession.userId,
              name: partSession.name,
              email: partSession.email,
              participantCode: partSession.participantCode,
              preferredLanguage: partSession.preferredLanguage || 'python',
              role: 'participant',
            },
          },
          { headers: NO_CACHE_HEADERS }
        );
      }

      // Fast fallback for legacy tokens lacking full fields
      await connectToDatabase();
      const participant = await Participant.findById(partSession.userId)
        .select('name email college participantCode preferredLanguage')
        .lean();

      if (participant) {
        return NextResponse.json(
          {
            authenticated: true,
            user: {
              id: participant._id.toString(),
              name: participant.name,
              email: participant.email,
              college: participant.college,
              participantCode: participant.participantCode,
              preferredLanguage: participant.preferredLanguage || 'python',
              role: 'participant',
            },
          },
          { headers: NO_CACHE_HEADERS }
        );
      }
    }

    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/auth/me] Error:', error);
    return NextResponse.json(
      { error: 'Server error retrieving identity.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
