import { Metadata } from 'next';

import { getPageMeta, getPageSnapshot, Page as MakeswiftPage } from '~/lib/makeswift';
import { buildOpenGraph, buildPageUrl } from '~/lib/seo';

interface Params {
  locale: string;
}

interface Props {
  params: Promise<Params>;
}

// GI: Next owns title/description/og/twitter tags (Makeswift's are disabled in MAKESWIFT_METADATA),
// with the canonical from our lib/seo helpers.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const snapshot = await getPageSnapshot({ path: '/', locale });
  const { title, description, socialImage } = snapshot ? getPageMeta(snapshot.document) : {};

  return {
    alternates: {
      canonical: buildPageUrl('/'),
    },
    ...(title && {
      title,
      ...(description && { description }),
      openGraph: buildOpenGraph({
        title,
        description: description ?? undefined,
        path: '/',
        image: socialImage ? { url: socialImage.publicUrl, alt: title } : undefined,
      }),
    }),
  };
}

// Intentionally no `generateStaticParams`: see the catch-all route for why the locale fan-out is
// gone.

export default async function Home({ params }: Props) {
  const { locale } = await params;

  return <MakeswiftPage locale={locale} path="/" />;
}
