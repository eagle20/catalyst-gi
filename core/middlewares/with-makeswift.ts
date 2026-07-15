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
      const draftRequest = new NextRequest(request.url, { headers: request.headers });

      if (routing.localeCookie) {
        // The locale switcher in the Makeswift Builder expects locale to be determined
        // from the URL, not from a cookie. Erase it so the intl middleware uses the URL.
        draftRequest.cookies.delete(localeCookieName(routing));
      }

      // Signal to Server Components that Makeswift draft mode is active. next-intl copies
      // all headers from draftRequest into its NextResponse.rewrite({ request: { headers } }),
      // which sets x-middleware-request-x-makeswift-draft-mode-active + x-middleware-override-headers.
      // The page handler receives this header and uses it to set previewMode and siteVersion
      // without relying on draftMode().isEnabled (which requires the cookie header override to work).
      draftRequest.headers.set('x-makeswift-draft-mode-active', '1');

      // Fast path: draft cookies are already in the browser. The Cookie header on
      // draftRequest already contains __prerender_bypass, so next-intl will carry it
      // to the page handler via x-middleware-request-cookie, and draftMode().isEnabled
      // will be true without any additional fetching.
      if (request.cookies.has('__prerender_bypass') && request.cookies.has('x-makeswift-draft-data')) {
        return middleware(draftRequest, event);
      }

      // Draft cookies not yet in the browser. Fetch them via VERCEL_URL — the
      // deployment's direct .vercel.app hostname — to bypass Cloudflare, which would
      // return a 403 bot-challenge page if we fetched through gitool.com.
      const internalOrigin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : request.nextUrl.origin;

      const draftModeUrl = new URL('/api/makeswift/draft-mode', internalOrigin);

      draftModeUrl.searchParams.set('secret', MAKESWIFT_SITE_API_KEY);

      try {
        const res = await fetch(draftModeUrl.toString());

        if (res.ok) {
          const setCookies = res.headers.getSetCookie();

          // Set cookies on draftRequest. next-intl copies all headers from draftRequest
          // into NextResponse.rewrite({ request: { headers } }), which sets
          // x-middleware-request-cookie + x-middleware-override-headers on the final
          // middleware response. Next.js/Vercel then applies these to the forwarded
          // request so the page handler sees draftMode().isEnabled = true.
          for (const cookieStr of setCookies) {
            const eqIdx = cookieStr.indexOf('=');
            const semicolonIdx = cookieStr.indexOf(';');

            if (eqIdx > 0) {
              const name = cookieStr.slice(0, eqIdx).trim();
              const value = cookieStr
                .slice(eqIdx + 1, semicolonIdx > eqIdx ? semicolonIdx : undefined)
                .trim();

              draftRequest.cookies.set(name, value);
            }
          }

          const response = await middleware(draftRequest, event);

          // Also persist the cookies in the browser so future requests skip this
          // VERCEL_URL fetch and the browser sends them directly in the Cookie header.
          for (const cookieStr of setCookies) {
            response.headers.append('Set-Cookie', cookieStr);
          }

          return response;
        }
      } catch {
        // Fall through — serve the page without draft mode rather than crashing.
      }

      // Fetch failed or returned non-200: serve without draft mode.
      return middleware(draftRequest, event);
    }

    return middleware(request, event);
  };
};
