import type { Metadata } from 'next';

import { defaultLocale, locales } from '~/i18n/routing';
import { client, getPageMeta, getPageSnapshot, Page } from '~/lib/makeswift';
import { buildOpenGraph, buildPageUrl, DEFAULT_SITE_NAME } from '~/lib/seo';

interface PageParams {
  locale: string;
  rest: string[];
}

// Not every Makeswift page has its SEO title filled in — fall back to a readable
// label derived from the path (same approach already used on the visual sitemap page)
// rather than dropping canonical/openGraph entirely for pages missing one.
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
  const snapshot = await getPageSnapshot(path, locale);
  const { title, description } = snapshot ? getPageMeta(snapshot.document) : {};

  return {
    ...(title && { title }),
    alternates: {
      canonical: buildPageUrl(path),
    },
    // image: null - Makeswift's own PageHead already renders og:image/twitter:image
    // from the page's socialImage when set (MAKESWIFT_METADATA keeps that on); adding
    // Next's generic fallback on top would produce two competing og:image tags.
    openGraph: buildOpenGraph({
      title: title || titleFromPath(path),
      description: description ?? undefined,
      path,
      image: null,
    }),
  };
}

export async function generateStaticParams(): Promise<PageParams[]> {
  const pages = await client.getPages().toArray();

  const params = pages
    .filter((page) => page.path !== '/')
    .flatMap((page) => localesFanOut(page.path));

  // Next.js requires providing at least one value in `generateStaticParams`.
  //
  // See https://github.com/vercel/next.js/pull/73933
  if (params.length === 0) {
    return [{ rest: ['dev', 'null'], locale: defaultLocale }];
  }

  return params;
}

export default async function CatchAllPage({ params }: { params: Promise<PageParams> }) {
  const { rest, locale } = await params;
  const path = `/${rest.join('/')}`;

  return <Page locale={locale} path={path} />;
}

function localesFanOut(path: string): PageParams[] {
  return locales.map((locale) => ({
    rest: path.split('/').filter((segment) => segment !== ''),
    locale,
  }));
}
