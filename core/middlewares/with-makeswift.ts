import { unstable_createMakeswiftDraftRequest } from '@makeswift/runtime/next/middleware';
import { NextRequest } from 'next/server';

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
      // gitool.com is behind Cloudflare, which returns a 403 bot-challenge page when
      // the SDK makes its internal self-fetch to /api/makeswift/draft-mode on the public
      // domain. Bypass Cloudflare by fetching via VERCEL_URL — the deployment's direct
      // .vercel.app hostname, which is not proxied through Cloudflare.
      const internalOrigin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : request.nextUrl.origin;

      const draftModeUrl = new URL('/api/makeswift/draft-mode', internalOrigin);
      draftModeUrl.searchParams.set('secret', MAKESWIFT_SITE_API_KEY);

      try {
        const res = await fetch(draftModeUrl.toString());

        if (res.ok) {
          const draftRequest = new NextRequest(request.url, { headers: request.headers });

          for (const cookieStr of res.headers.getSetCookie()) {
            const eqIdx = cookieStr.indexOf('=');
            const semicolonIdx = cookieStr.indexOf(';');
            if (eqIdx > 0) {
              const name = cookieStr.slice(0, eqIdx).trim();
              const value = cookieStr.slice(eqIdx + 1, semicolonIdx > eqIdx ? semicolonIdx : undefined).trim();
              draftRequest.cookies.set(name, value);
            }
          }

          if (routing.localeCookie) {
            // If the i18n middleware is configured to use a cookie, it will first try to derive the
            // locale from the existing request cookie before attempting to match the URL against the
            // locale routes. The locale switcher in the Makeswift Builder expects the host to always
            // determine the locale from the URL, though, so we have to erase the cookie from the
            // proxied request to force that behavior.
            draftRequest.cookies.delete(localeCookieName(routing));
          }

          const response = await middleware(draftRequest, event);

          // withRoutes returns NextResponse.rewrite() which does not automatically forward
          // modified request headers to the origin. Without this, draftMode().isEnabled is
          // false in the page handler → MakeswiftProvider previewMode={false} → not editable.
          // Setting x-middleware-request-cookie explicitly tells Next.js to override the
          // Cookie header on the forwarded/rewritten request, for both next() and rewrite().
          const cookieHeader = draftRequest.headers.get('cookie');

          if (cookieHeader) {
            response.headers.set('x-middleware-request-cookie', cookieHeader);
          }

          return response;
        }
      } catch {
        // Fall through to SDK path below.
      }
    }

    const draftRequest = await unstable_createMakeswiftDraftRequest(request, MAKESWIFT_SITE_API_KEY);

    if (draftRequest != null) {
      if (routing.localeCookie) {
        draftRequest.cookies.delete(localeCookieName(routing));
      }

      return middleware(draftRequest, event);
    }

    return middleware(request, event);
  };
};
