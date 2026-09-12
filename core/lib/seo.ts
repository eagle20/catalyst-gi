import { Metadata } from 'next';

// NEXT_PUBLIC_STORE_NAME is referenced by product/[slug] and webpages/[id]/normal but
// was never actually set in .env.local/.env.example, so both silently fall back to two
// different hardcoded strings today. This is the one fallback going forward.
export const DEFAULT_SITE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'GI Tool Store';

export function buildPageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://gitool.com';

  return `${base}${path}`;
}

export function buildOpenGraph({
  title,
  description,
  path,
  image,
  siteName = DEFAULT_SITE_NAME,
}: {
  title: string;
  description?: string;
  path: string;
  image?: { url: string; alt: string };
  siteName?: string;
}): NonNullable<Metadata['openGraph']> {
  return {
    title,
    description,
    url: buildPageUrl(path),
    siteName,
    images: [
      image ?? {
        url: process.env.NEXT_PUBLIC_OG_IMAGE || '/favicon.ico',
        alt: `${siteName} Logo`,
      },
    ],
  };
}
