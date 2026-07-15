import { unstable_createMakeswiftDraftRequest } from '@makeswift/runtime/next/middleware';

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
    let draftRequest;

    // Diagnostic: probe the draft-mode endpoint directly before calling the SDK.
    const draftParam = request.nextUrl.searchParams.get('x-makeswift-draft-mode');
    if (draftParam != null) {
      try {
        const probeUrl = new URL('/api/makeswift/draft-mode', request.nextUrl.origin);
        probeUrl.searchParams.set('secret', MAKESWIFT_SITE_API_KEY);
        const probeRes = await fetch(probeUrl.toString());
        const probeBody = await probeRes.text();
        console.log(
          '[withMakeswift] probe status:', probeRes.status,
          'set-cookie:', probeRes.headers.get('set-cookie'),
          'body:', probeBody.slice(0, 300),
        );
      } catch (probeErr) {
        console.error('[withMakeswift] probe fetch threw:', String(probeErr));
      }
    }

    try {
      draftRequest = await unstable_createMakeswiftDraftRequest(request, MAKESWIFT_SITE_API_KEY);
    } catch (err: unknown) {
      const cause = (err as { cause?: unknown })?.cause;
      console.error(
        '[withMakeswift] Draft request failed.',
        'error:', String(err),
        'cause:', String(cause),
      );
      throw err;
    }

    if (draftRequest != null) {
      if (routing.localeCookie) {
        // If the i18n middleware is configured to use a cookie, it will first try to derive the
        // locale from the existing request cookie before attempting to match the URL against the
        // locale routes. The locale switcher in the Makeswift Builder expects the host to always
        // determine the locale from the URL, though, so we have to erase the cookie from the
        // proxied request to force that behavior.
        draftRequest.cookies.delete(localeCookieName(routing));
      }

      return middleware(draftRequest, event);
    }

    return middleware(request, event);
  };
};
