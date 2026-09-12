import { Makeswift } from '@makeswift/runtime/next';
import { getSiteVersion } from '@makeswift/runtime/next/server';
import { strict } from 'assert';
import { cache } from 'react';
import { getLocale } from 'next-intl/server';

import { defaultLocale } from '~/i18n/routing';

import { runtime } from './runtime';

strict(process.env.MAKESWIFT_SITE_API_KEY, 'MAKESWIFT_SITE_API_KEY is required');

export const client = new Makeswift(process.env.MAKESWIFT_SITE_API_KEY, {
  runtime,
});

// Positional primitive args (not a destructured object) so `cache()` can dedupe by
// value — React's cache() keys object arguments by reference, which would miss every
// time since each call site constructs a fresh `{ path, locale }` literal.
export const getPageSnapshot = cache(async (path: string, locale: string) =>
  client.getPageSnapshot(path, {
    siteVersion: await getSiteVersion(),
    locale: normalizeLocale(locale),
  }),
);

export const getComponentSnapshot = async (snapshotId: string) => {
  const locale = await getLocale();

  return await client.getComponentSnapshot(snapshotId, {
    siteVersion: await getSiteVersion(),
    locale: normalizeLocale(locale),
  });
};

function normalizeLocale(_locale: string): string | undefined {
  // Makeswift only has English content — always serve default locale
  // to prevent 404 errors for non-English locales (e.g. es-MX)
  return undefined;
}
