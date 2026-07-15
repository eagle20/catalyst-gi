import { NextRequest, NextResponse } from 'next/server';

import { routing } from '~/i18n/routing';

import { MiddlewareFactory } from './compose-middlewares';

if (!process.env.MAKESWIFT_SITE_API_KEY) {
  throw new Error('MAKESWIFT_SITE_API_KEY is not set');
}

const MAKESWIFT_SITE_API_KEY = process.env.MAKESWIFT_SITE_API_KEY;

const localeCookieName = ({ localeCookie }: { localeCookie?: boolean | { name?: string } }) =>
  (typeof localeCookie === 'object' ? localeCookie.name : undefined) ?? 'NEXT_LOCALE';

export const withMakeswift: MiddlewareFactory = (middleware) => {
  return async (request, event) => {
    const draftParam = request.nextUrl.searchParams.get('x-makeswift-draft-mode');

    if (draftParam === MAKESWIFT_SITE_API_KEY) {
      const hasBypass = request.cookies.has('__prerender_bypass');
      const hasDraftData = request.cookies.has('x-makeswift-draft-data');

      if (!hasBypass || !hasDraftData) {
        // Draft cookies not in browser yet. Fetch them via VERCEL_URL (the deployment's
        // direct .vercel.app hostname) to bypass Cloudflare, then redirect to the same
        // URL so the browser stores them via Set-Cookie. On the next request the browser
        // sends the cookies → draftMode().isEnabled = true in the page handler.
        const internalOrigin = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : request.nextUrl.origin;

        const draftModeUrl = new URL('/api/makeswift/draft-mode', internalOrigin);

        draftModeUrl.searchParams.set('secret', MAKESWIFT_SITE_API_KEY);

        try {
          const res = await fetch(draftModeUrl.toString());

          if (res.ok) {
            const response = NextResponse.redirect(request.url);

            for (const cookieStr of res.headers.getSetCookie()) {
              response.headers.append('Set-Cookie', cookieStr);
            }

            return response;
          }
        } catch {
          // Fall through — serve the page without draft mode rather than crashing.
        }
      }

      // Draft cookies are present in the browser. Pass the request directly through
      // the middleware chain — the page handler reads __prerender_bypass from the
      // incoming Cookie header and draftMode().isEnabled returns true.
      // Do NOT call unstable_createMakeswiftDraftRequest: it always re-fetches the
      // draft-mode endpoint using request.nextUrl.origin (gitool.com), which Cloudflare
      // would block with a 403 bot-challenge page.
      const draftRequest = new NextRequest(request.url, { headers: request.headers });

      if (routing.localeCookie) {
        // If the i18n middleware is configured to use a cookie, it will first try to derive
        // the locale from the existing request cookie before attempting to match the URL
        // against the locale routes. The locale switcher in the Makeswift Builder expects
        // the host to always determine the locale from the URL, so erase the cookie from
        // the proxied request to force that behavior.
        draftRequest.cookies.delete(localeCookieName(routing));
      }

      return middleware(draftRequest, event);
    }

    return middleware(request, event);
  };
};
