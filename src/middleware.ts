import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const DEFAULT_SECRET = 'cipher_coding_operation_zero_day_super_secure_jwt_secret_key_2026!';
function getJwtSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET);
}
const AUTH_COOKIE_NAME = 'zero_day_auth_token';
const ADMIN_COOKIE_NAME = 'zero_day_admin_token';
const PARTICIPANT_COOKIE_NAME = 'zero_day_participant_token';
const PARTICIPANT_COOKIE_PREFIX = 'zero_day_part_';

/**
 * Helper to inspect the request cookies and verify if an active
 * participant or admin token is present.
 */
async function getAuthenticatedRole(req: NextRequest): Promise<'participant' | 'admin' | null> {
  const secret = getJwtSecret();

  // 1. Check Admin token strictly
  const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (adminToken) {
    try {
      const { payload } = await jwtVerify(adminToken, secret);
      if ((payload as any).role === 'admin') return 'admin';
    } catch {}
  }

  // 2. Check Participant token strictly
  const partToken = req.cookies.get(PARTICIPANT_COOKIE_NAME)?.value;
  if (partToken) {
    try {
      const { payload } = await jwtVerify(partToken, secret);
      if ((payload as any).role === 'participant') return 'participant';
    } catch {}
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoginRoute = pathname === '/login';
  const isAdminLoginRoute = pathname === '/admin/login';
  const isRegisterRoute = pathname === '/register';
  const isMissionRoute = pathname.startsWith('/mission');
  const isAdminRoute = pathname.startsWith('/admin') && !isAdminLoginRoute;

  // 1. If user is accessing login or register pages, redirect if already authenticated
  if (isLoginRoute || isRegisterRoute) {
    const role = await getAuthenticatedRole(req);
    if (role === 'participant') {
      return NextResponse.redirect(new URL('/mission', req.url));
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.next();
  }

  // 2. If user is accessing admin login, redirect if already authenticated
  if (isAdminLoginRoute) {
    const role = await getAuthenticatedRole(req);
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (role === 'participant') {
      return NextResponse.redirect(new URL('/mission', req.url));
    }
    return NextResponse.next();
  }

  // 3. Protect Admin routes
  if (isAdminRoute) {
    const role = await getAuthenticatedRole(req);
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  // 4. Protect Mission routes
  if (isMissionRoute) {
    const role = await getAuthenticatedRole(req);
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (role !== 'participant') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/mission/:path*',
    '/admin/:path*',
    '/login',
    '/admin/login',
    '/register',
  ],
};
