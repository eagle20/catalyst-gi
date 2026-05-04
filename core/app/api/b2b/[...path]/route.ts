/**
 * Storefront → Portal proxy for B2B API calls.
 *
 * Requests that arrive at /api/b2b/<anything> are forwarded to the portal's
 * /api/storefront/<anything> endpoint with two auth headers injected:
 *   x-portal-secret  — shared secret known only to both servers
 *   x-customer-email — the logged-in customer's email from the NextAuth session
 *
 * This keeps the portal secret out of the browser entirely.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/auth';

const PORTAL_URL = (process.env.B2B_PORTAL_URL ?? '').replace(/\/$/, '');
const PORTAL_SECRET = process.env.B2B_PORTAL_SECRET ?? '';

async function proxy(request: NextRequest, method: string): Promise<NextResponse> {
  if (!PORTAL_URL) {
    console.error('[B2B proxy] B2B_PORTAL_URL env var is not set');
    return NextResponse.json({ error: 'Portal not configured' }, { status: 503 });
  }

  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Strip the /api/b2b prefix and forward the rest including query string
  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/b2b\/?/, '');
  const portalUrl = `${PORTAL_URL}/api/storefront/${subPath}${url.search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-portal-secret': PORTAL_SECRET,
    'x-customer-email': session.user.email,
  };

  const body = method !== 'GET' ? await request.text() : undefined;

  let response: Response;
  try {
    response = await fetch(portalUrl, { method, headers, body });
  } catch (err) {
    console.error('[B2B proxy] fetch error:', err);
    return NextResponse.json({ error: 'Portal unreachable' }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest) {
  return proxy(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxy(request, 'POST');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
