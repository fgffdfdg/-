import { cookies } from 'next/headers';
import crypto from 'crypto';

// ============================================================
// Admin Auth - 独立于用户端 Supabase Auth 的管理员认证系统
// ============================================================

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT = 'exportdrive-admin-salt-2024';

// HMAC secret for session token signing
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'exportdrive-admin-session-secret-default';

interface AdminSessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
}

/**
 * Hash password using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, SCRYPT_SALT, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, SCRYPT_SALT, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex') === hash);
    });
  });
}

/**
 * Create signed session token
 */
function createSessionToken(payload: AdminSessionPayload): string {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadStr)
    .digest('hex');
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode session token
 */
function verifySessionToken(token: string): AdminSessionPayload | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadStr)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: AdminSessionPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64').toString()
    );

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Set admin session cookie
 */
export async function setAdminSession(admin: AdminUser): Promise<void> {
  const cookieStore = await cookies();
  const payload: AdminSessionPayload = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const token = createSessionToken(payload);

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Get current admin session from cookie
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Clear admin session cookie
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export type { AdminSessionPayload, AdminUser };
