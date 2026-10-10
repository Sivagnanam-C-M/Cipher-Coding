import { SignJWT, jwtVerify } from 'jose';

const DEFAULT_SECRET = 'cipher_coding_operation_zero_day_super_secure_jwt_secret_key_2026!';
function getJwtSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET);
}

export interface AuthTokenPayload {
  userId: string;
  role: 'participant' | 'admin';
  email: string;
  name?: string;
  participantCode?: string;
  preferredLanguage?: 'python' | 'java' | 'c' | 'cpp';
}

export async function createAuthToken(payload: AuthTokenPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h') // 12-hour session
    .sign(getJwtSecret());

  return token;
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}
