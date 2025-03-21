import 'server-only'
import { decryptJWE, DEFAULT_MAX_AGE } from './jwt'
import { cookies } from 'next/headers'

export async function updateSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;

  const payload = await decryptJWE(session);
  if (!payload) return null;

  const expiresAt = new Date(Date.now() + (DEFAULT_MAX_AGE * 1000));
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}