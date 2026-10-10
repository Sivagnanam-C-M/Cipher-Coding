import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const { searchParams } = new URL(req.url);
    const roleParam = body.role || searchParams.get('role');
    const participantCode = body.participantCode || searchParams.get('participantCode');

    // Extract all cookies currently sent by client
    const reqCookies = req.cookies.getAll().map((c) => c.name);

    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

    // 1. Explicit role target
    if (roleParam === 'admin' || roleParam === 'participant' || roleParam === 'all') {
      const response = NextResponse.json(
        {
          success: true,
          message: `Logged out of ${roleParam} account successfully.`,
        },
        { headers }
      );
      return clearAuthCookie(response, {
        role: roleParam,
        participantCode,
        extraCookiesToClear: reqCookies,
      });
    }

    // 2. Infer from Referer header if role not explicitly sent
    const referer = req.headers.get('referer') || '';
    if (referer.includes('/admin')) {
      const response = NextResponse.json(
        {
          success: true,
          message: 'Admin session disconnected successfully.',
        },
        { headers }
      );
      return clearAuthCookie(response, {
        role: 'admin',
        extraCookiesToClear: reqCookies,
      });
    }

    // 3. Default: Disconnect participant session
    const response = NextResponse.json(
      {
        success: true,
        message: 'Participant session disconnected successfully.',
      },
      { headers }
    );
    return clearAuthCookie(response, {
      role: 'participant',
      participantCode,
      extraCookiesToClear: reqCookies,
    });
  } catch (error: any) {
    console.error('[API /api/auth/logout] Error:', error);
    const reqCookies = req.cookies.getAll().map((c) => c.name);
    const response = NextResponse.json(
      { success: true, message: 'Logged out.' },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
    return clearAuthCookie(response, {
      role: 'all',
      extraCookiesToClear: reqCookies,
    });
  }
}
