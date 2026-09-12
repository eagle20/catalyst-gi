import type { Metadata } from 'next';

import { locales } from '~/i18n/routing';
import { getPageMeta, getPageSnapshot, Page as MakeswiftPage } from '~/lib/makeswift';
import { buildOpenGraph, buildPageUrl } from '~/lib/seo';

interface Params {
  locale: string;
}

interface Props {
  params: Promise<Params>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const snapshot = await getPageSnapshot('/', locale);
  const { title, description } = snapshot ? getPageMeta(snapshot.document) : {};

  return {
    alternates: {
      canonical: buildPageUrl('/'),
    },
    ...(title && {
      title,
      openGraph: buildOpenGraph({ title, description: description ?? undefined, path: '/' }),
    }),
  };
}

export function generateStaticParams(): Params[] {
  return locales.map((locale) => ({ locale }));
}

export default async function Home({ params }: Props) {
  const { locale } = await params;

  return <MakeswiftPage locale={locale} path="/" />;
}
