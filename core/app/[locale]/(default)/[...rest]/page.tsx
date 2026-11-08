import { Metadata } from 'next';

import { getPageMeta, getPageSnapshot, Page } from '~/lib/makeswift';
import { buildOpenGraph, buildPageUrl, DEFAULT_SITE_NAME } from '~/lib/seo';

interface PageParams {
  locale: string;
  rest: string[];
}

// GI: not every Makeswift page has its SEO title filled in. Fall back to a readable label derived
// from the path (the same approach as the visual sitemap page) rather than dropping
// canonical/openGraph entirely for pages missing one.
function titleFromPath(path: string): string {
  const lastSegment = path.split('/').filter(Boolean).pop() ?? '';
  const readable = lastSegment.replaceAll('-', ' ');

  return readable ? readable.charAt(0).toUpperCase() + readable.slice(1) : DEFAULT_SITE_NAME;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { rest, locale } = await params;
  const path = `/${rest.join('/')}`;
  const snapshot = await getPageSnapshot({ path, locale });
  const { title, description, socialImage } = snapshot ? getPageMeta(snapshot.document) : {};
  const resolvedTitle = title || titleFromPath(path);

  return {
    ...(title && { title }),
    ...(description && { description }),
    alternates: {
      canonical: buildPageUrl(path),
    },
    openGraph: buildOpenGraph({
      title: resolvedTitle,
      description: description ?? undefined,
      path,
      image: socialImage ? { url: socialImage.publicUrl, alt: resolvedTitle } : undefined,
    }),
  };
}

// Intentionally no `generateStaticParams`: the locale list is resolved at runtime now, and every
// route under `[locale]` already renders on demand because the tree reads cookies, so fanning
// Makeswift page paths out over locales would only reintroduce a build-time dependency on the
// locale list without prerendering anything.

export default async function CatchAllPage({ params }: { params: Promise<PageParams> }) {
  const { rest, locale } = await params;
  const path = `/${rest.join('/')}`;

  return <Page locale={locale} path={path} />;
}
