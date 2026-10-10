import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { AdminLoginSchema } from '@/lib/validation';
import { verifyPassword } from '@/lib/auth/password';
import { setAuthCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AdminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid admin credentials provided.' },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;
    const cleanId = identifier.trim().toLowerCase();

    await connectToDatabase();

    const admin = await Admin.findOne({
      $or: [{ email: cleanId }, { username: cleanId }],
    }).select('+passwordHash');

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authorization failed.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Admin authorization failed.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
      redirectTo: '/admin',
    });

    return await setAuthCookie(response, {
      userId: admin._id.toString(),
      role: 'admin',
      email: admin.email,
      name: admin.username,
    });
  } catch (error: any) {
    console.error('[API /api/auth/admin-login] Error:', error);
    return NextResponse.json(
      { error: 'Admin authentication service error.' },
      { status: 500 }
    );
  }
}
