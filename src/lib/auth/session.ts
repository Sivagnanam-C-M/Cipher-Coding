import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AuthTokenPayload, createAuthToken, verifyAuthToken } from './token';

export const AUTH_COOKIE_NAME = 'zero_day_auth_token'; // legacy fallback
export const ADMIN_COOKIE_NAME = 'zero_day_admin_token';
export const PARTICIPANT_COOKIE_NAME = 'zero_day_participant_token';
export const PARTICIPANT_COOKIE_PREFIX = 'zero_day_part_'; // legacy prefix for cleanup

export interface SessionOptions {
  role?: 'admin' | 'participant';
  participantCode?: string;
}

/**
 * Retrieve admin session strictly from ADMIN_COOKIE_NAME.
 */
export async function getAdminSession(): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (adminToken) {
      const payload = await verifyAuthToken(adminToken);
      if (payload && payload.role === 'admin') return payload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve participant session strictly from PARTICIPANT_COOKIE_NAME.
 * Never performs loose/random cookie discovery across previous sessions.
 */
export async function getParticipantSession(
  requestedCode?: string
): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const partToken = cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value;
    if (partToken) {
      const payload = await verifyAuthToken(partToken);
      if (payload && payload.role === 'participant') {
        if (!requestedCode || payload.participantCode === requestedCode.toUpperCase()) {
          return payload;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generic getSession helper supporting role and code options.
 */
export async function getSession(options?: SessionOptions): Promise<AuthTokenPayload | null> {
  if (options?.role === 'admin') {
    return await getAdminSession();
  }
  if (options?.role === 'participant') {
    return await getParticipantSession(options?.participantCode);
  }

  const participantSession = await getParticipantSession(options?.participantCode);
  if (participantSession) return participantSession;

  const adminSession = await getAdminSession();
  if (adminSession) return adminSession;

  return null;
}

/**
 * Set HTTP-only auth cookie on a NextResponse object.
 * Admin and Participant sessions use distinct authoritative cookies.
 */
export async function setAuthCookie(
  response: NextResponse,
  payload: AuthTokenPayload
): Promise<NextResponse> {
  const token = await createAuthToken(payload);
  const isSecure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' &&
      process.env.COOKIE_SECURE !== 'false' &&
      !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://'));

  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  };

  const expireOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };

  if (payload.role === 'admin') {
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      ...cookieOptions,
    });
  } else {
    response.cookies.set({
      name: PARTICIPANT_COOKIE_NAME,
      value: token,
      ...cookieOptions,
    });
  }

  // Proactively expire legacy auth token and any stale cookie variations
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    ...expireOptions,
  });

  return response;
}

/**
 * Clear HTTP-only auth cookie on logout.
 * Ensures the target account's session cookie and all legacy tokens are immediately expired.
 */
export function clearAuthCookie(
  response: NextResponse,
  options?: {
    role?: 'admin' | 'participant' | 'all';
    participantCode?: string;
    extraCookiesToClear?: string[];
  }
): NextResponse {
  const isSecure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' &&
      process.env.COOKIE_SECURE !== 'false' &&
      !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://'));

  const expireOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };

  const clearCookieByName = (name: string) => {
    response.cookies.set({
      name,
      value: '',
      ...expireOptions,
    });
  };

  const role = options?.role;

  if (role === 'admin') {
    clearCookieByName(ADMIN_COOKIE_NAME);
  } else if (role === 'participant') {
    clearCookieByName(PARTICIPANT_COOKIE_NAME);
  } else {
    // Clear both
    clearCookieByName(ADMIN_COOKIE_NAME);
    clearCookieByName(PARTICIPANT_COOKIE_NAME);
  }

  // Always expire legacy token
  clearCookieByName(AUTH_COOKIE_NAME);

  // Expire all incoming cookies starting with zero_day_
  if (options?.extraCookiesToClear) {
    for (const name of options.extraCookiesToClear) {
      if (name.startsWith('zero_day_')) {
        clearCookieByName(name);
      }
    }
  }

  return response;
}
