import { Makeswift } from '@makeswift/runtime/next';
import { getSiteVersion } from '@makeswift/runtime/next/server';
import { strict } from 'assert';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { defaultLocale } from '~/i18n/routing';

import { runtime } from './runtime';

strict(process.env.MAKESWIFT_SITE_API_KEY, 'MAKESWIFT_SITE_API_KEY is required');

export const client = new Makeswift(process.env.MAKESWIFT_SITE_API_KEY, {
  runtime,
  apiOrigin: process.env.MAKESWIFT_API_ORIGIN,
});

// Use the custom header set by withMakeswift middleware as the authoritative source for
// draft mode, rather than getSiteVersion() which depends on draftMode().isEnabled. The
// cookie header override via x-middleware-request-cookie may not be applied by Vercel's
// edge infrastructure, so we use a plain request header instead.
async function getEffectiveSiteVersion() {
  const h = await headers();

  if (h.get('x-makeswift-draft-mode-active') === '1') {
    return 'Working' as const;
  }

  return getSiteVersion();
}

export const getPageSnapshot = async ({ path, locale }: { path: string; locale: string }) =>
  await client.getPageSnapshot(path, {
    siteVersion: await getEffectiveSiteVersion(),
    locale: normalizeLocale(locale),
  });

export const getComponentSnapshot = async (snapshotId: string) => {
  const locale = await getLocale();

  return await client.getComponentSnapshot(snapshotId, {
    siteVersion: await getEffectiveSiteVersion(),
    locale: normalizeLocale(locale),
  });
};

function normalizeLocale(_locale: string): string | undefined {
  // Makeswift only has English content — always serve default locale
  // to prevent 404 errors for non-English locales (e.g. es-MX)
  return undefined;
}
