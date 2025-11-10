import { notFound } from 'next/navigation';

import { locales } from '~/i18n/routing';
import { Page as MakeswiftPage } from '~/lib/makeswift';

interface Params {
  locale: string;
}

export function generateStaticParams(): Params[] {
  return locales.map((locale) => ({ locale }));
}

interface Props {
  params: Promise<Params>;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;

  // Validate locale before calling MakeswiftPage to prevent errors with invalid locales like '_vercel'
  if (!locales.includes(locale as any)) {
    notFound();
  }

  return <MakeswiftPage locale={locale} path="/" />;
}
