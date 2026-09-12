import { Page as MakeswiftPage, type MakeswiftPageDocument } from '@makeswift/runtime/next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { getPageSnapshot } from './client';

// Mirrors the priority the SDK's own PageHead uses internally (base localized page
// wins over the top-level document field) — reading document.meta.title directly
// would silently miss a title/description/image set on the base locale variant.
export function getPageMeta(document: MakeswiftPageDocument) {
  const baseLocalizedPage = document.localizedPages.find(({ parentId }) => parentId == null);

  return {
    title: baseLocalizedPage?.meta.title ?? document.meta.title,
    description: baseLocalizedPage?.meta.description ?? document.meta.description,
    socialImage: baseLocalizedPage?.meta.socialImage ?? document.meta.socialImage,
  };
}

// Next.js's own generateMetadata is the single source of truth for title/description/
// image (and the og:/twitter: tags derived from them) — Makeswift's built-in PageHead
// would otherwise render a second, duplicate set from the page's own SEO settings.
// socialImage is off here too: Next's twitter:card auto-derivation still defaults to
// "summary" whenever openGraph is present, even with no images set, so omitting just
// the image field from openGraph doesn't avoid a second (conflicting) twitter:card —
// only having exactly one system own image/title/description together does. The real
// image is pulled from the snapshot via getPageMeta and passed into buildOpenGraph
// instead. canonicalUrl/indexingBlocked/favicon/keywords are unaffected by any of this
// and stay on. All keys must be listed explicitly — flattenMetadataSettings does not
// backfill omitted keys, so a partial object would silently disable them too.
export const MAKESWIFT_METADATA = {
  title: false,
  description: false,
  keywords: true,
  socialImage: false,
  canonicalUrl: true,
  indexingBlocked: true,
  favicon: true,
} as const;

export async function Page({ path, locale }: { path: string; locale: string }) {
  const snapshot = await getPageSnapshot(path, locale);

  if (snapshot == null) {
    // This is a temporary solution to fix the issue where non-published pages are not editable in the builder.
    await connection();

    return notFound();
  }

  return <MakeswiftPage metadata={MAKESWIFT_METADATA} snapshot={snapshot} />;
}
