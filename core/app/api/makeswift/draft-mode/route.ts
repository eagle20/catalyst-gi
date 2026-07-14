import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// This route overrides @makeswift/runtime's built-in /api/makeswift/draft-mode
// handler (which lives in the [...makeswift] catch-all) because that handler
// calls cookies().get('__prerender_bypass') after draftMode().enable(), but in
// Next.js 15 Route Handlers cookies() returns a read-only snapshot of the
// *incoming* request cookies — it cannot see cookies that draftMode().enable()
// just added to the mutable response cookies. The SDK therefore always gets null
// and returns 500, causing MIDDLEWARE_INVOCATION_FAILED in the Makeswift builder.
//
// The fix: call draftMode().enable() and return 200. Next.js automatically
// merges mutableCookies (including __prerender_bypass) into the response headers
// via appendMutableCookies before sending the response over the wire, so the
// middleware's self-fetch receives the Set-Cookie headers it needs.

const DRAFT_DATA_COOKIE = 'x-makeswift-draft-data';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const apiKey = process.env.MAKESWIFT_SITE_API_KEY;

  if (!secret || !apiKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (secret !== apiKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  // __prerender_bypass is auto-merged into response headers by Next.js.
  // We only need to additionally set the Makeswift draft-data cookie.
  const response = NextResponse.json({ __brand: 'DraftModeResponse' });

  response.cookies.set({
    name: DRAFT_DATA_COOKIE,
    value: JSON.stringify({ makeswift: true, siteVersion: 'Working' }),
    sameSite: 'none',
    secure: true,
    partitioned: true,
    path: '/',
  });

  return response;
}
