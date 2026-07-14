import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Workaround for Next.js 15 incompatibility in @makeswift/runtime 0.23.11.
//
// The SDK's built-in /api/makeswift/draft-mode handler (in the [...makeswift]
// catch-all) calls cookies().get('__prerender_bypass') after draftMode().enable().
// In Next.js 15 Route Handlers, cookies() returns a read-only snapshot of the
// incoming request — it cannot see the cookie just set on mutableCookies by
// enable(). The handler always gets null → returns 500 → middleware throws
// UnknownDraftFetchRequestError → MIDDLEWARE_INVOCATION_FAILED in the builder.
//
// Fix: access mutableCookies directly from the workUnitStore after enable() to
// read the bypass token, then set it explicitly on the response.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external') as {
  workUnitAsyncStorage: { getStore(): { mutableCookies: { get(name: string): { value: string } | undefined; getAll(): Array<{ name: string; value: string; [k: string]: unknown }> } } | undefined };
};

const PRERENDER_BYPASS_COOKIE = '__prerender_bypass';
const DRAFT_DATA_COOKIE = 'x-makeswift-draft-data';

export async function GET(request: NextRequest) {
  console.log('[draft-mode/route] custom handler called');

  const secret = request.nextUrl.searchParams.get('secret');
  const apiKey = process.env.MAKESWIFT_SITE_API_KEY;

  if (!secret || !apiKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (secret !== apiKey) {
    return new NextResponse('Unauthorized: secret mismatch', { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  // Read __prerender_bypass directly from mutableCookies (the ResponseCookies
  // store that draftMode().enable() writes to) since cookies() is read-only here.
  const store = workUnitAsyncStorage.getStore();
  const bypassValue = store?.mutableCookies?.get(PRERENDER_BYPASS_COOKIE)?.value;

  console.log('[draft-mode/route] bypassValue:', bypassValue ? 'found' : 'missing');

  if (!bypassValue) {
    return new NextResponse('Could not retrieve draft mode bypass cookie', { status: 500 });
  }

  const response = NextResponse.json({ __brand: 'DraftModeResponse' });

  response.cookies.set({
    name: PRERENDER_BYPASS_COOKIE,
    value: bypassValue,
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
  });

  response.cookies.set({
    name: DRAFT_DATA_COOKIE,
    value: JSON.stringify({ makeswift: true, siteVersion: 'Working' }),
    sameSite: 'none',
    secure: true,
    path: '/',
  });

  return response;
}
