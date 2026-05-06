import { createHmac } from 'crypto';

const SECRET = process.env.B2B_PORTAL_SECRET ?? '';
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a short-lived HMAC-signed SSO URL for the portal.
 * Call server-side only — keeps B2B_PORTAL_SECRET out of the browser.
 */
export function generateSSOUrl(email: string, portalBaseUrl: string, redirectPath = '/dashboard'): string {
  if (!SECRET || !portalBaseUrl) return portalBaseUrl || '';

  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url');

  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  const token = `${payload}.${sig}`;

  const url = new URL('/api/auth/sso', portalBaseUrl);
  url.searchParams.set('token', token);
  url.searchParams.set('redirect', redirectPath);
  return url.toString();
}
