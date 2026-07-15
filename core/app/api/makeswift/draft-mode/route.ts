import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Workaround for Next.js 15 incompatibility in @makeswift/runtime 0.23.11.
//
// The SDK's built-in /api/makeswift/draft-mode handler (in [...makeswift]) reads
// __prerender_bypass back from cookies() after calling draftMode().enable().
// In Next.js 15 Route Handlers, cookies() returns a read-only snapshot of the
// incoming request — it cannot see the cookie that enable() wrote to mutableCookies.
// The SDK therefore gets null → returns 500 → middleware throws UnknownDraftFetchRequestError
// → MIDDLEWARE_INVOCATION_FAILED in the Makeswift builder.
//
// Fix: call draftMode().enable() and return 200 without reading the cookie back.
// Next.js's app-route module calls appendMutableCookies() after the handler returns,
// which copies mutableCookies (including __prerender_bypass) into the response
// Set-Cookie headers automatically. The SDK reads those headers from the 200 response.

const DRAFT_DATA_COOKIE = 'x-makeswift-draft-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const apiKey = process.env.MAKESWIFT_SITE_API_KEY;

  if (!secret || !apiKey || secret !== apiKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const draft = await draftMode();
    draft.enable();
  } catch (err: unknown) {
    console.error('[draft-mode/route] draftMode().enable() threw:', String(err));
    return new NextResponse(`Failed to enable draft mode: ${String(err)}`, { status: 500 });
  }

  // __prerender_bypass is merged into Set-Cookie automatically by appendMutableCookies.
  // We only need to set the Makeswift draft-data cookie explicitly.
  const response = NextResponse.json({ enabled: true });

  response.cookies.set({
    name: DRAFT_DATA_COOKIE,
    value: JSON.stringify({ makeswift: true, siteVersion: 'Working' }),
    sameSite: 'none',
    secure: true,
    path: '/',
  });

  return response;
}
