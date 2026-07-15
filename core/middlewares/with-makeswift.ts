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
      // gitool.com is behind Cloudflare, which blocks the SDK's internal self-fetch
      // to /api/makeswift/draft-mode with a 403 bot-challenge page. Bypass Cloudflare
      // by fetching via VERCEL_URL (the deployment's direct .vercel.app hostname).
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
            draftRequest.cookies.delete(localeCookieName(routing));
          }

          return middleware(draftRequest, event);
        }

        console.error('[withMakeswift] draft-mode fetch returned:', res.status, 'origin:', internalOrigin);
      } catch (err) {
        console.error('[withMakeswift] draft-mode fetch threw:', String(err));
      }

      // If the internal fetch failed, fall through and let the SDK attempt its own
      // self-fetch (will likely also fail, but preserves the original error path).
    }

    // Non-draft-mode requests, or fallback if the internal fetch failed above.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { unstable_createMakeswiftDraftRequest } = require('@makeswift/runtime/next/middleware') as {
      unstable_createMakeswiftDraftRequest: typeof import('@makeswift/runtime/next/middleware').unstable_createMakeswiftDraftRequest;
    };

    let draftRequest;
    try {
      draftRequest = await unstable_createMakeswiftDraftRequest(request, MAKESWIFT_SITE_API_KEY);
    } catch (err: unknown) {
      console.error('[withMakeswift] SDK draft request failed:', String(err));
      throw err;
    }

    if (draftRequest != null) {
      if (routing.localeCookie) {
        draftRequest.cookies.delete(localeCookieName(routing));
      }
      return middleware(draftRequest, event);
    }

    return middleware(request, event);
  };
};
