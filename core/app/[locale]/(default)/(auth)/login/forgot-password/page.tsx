import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ForgotPasswordSection } from '@/vibes/soul/sections/forgot-password-section';
import { buildOpenGraph, buildPageUrl } from '~/lib/seo';

import { resetPassword } from './_actions/reset-password';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'Auth.Login.ForgotPassword' });

  return {
    title: t('title'),
    alternates: {
      canonical: buildPageUrl('/login/forgot-password'),
    },
    openGraph: buildOpenGraph({ title: t('title'), path: '/login/forgot-password' }),
  };
}

export default async function Reset(props: Props) {
  const { locale } = await props.params;

  setRequestLocale(locale);

  const t = await getTranslations('Auth.Login.ForgotPassword');

  return (
    <ForgotPasswordSection action={resetPassword} subtitle={t('subtitle')} title={t('title')} />
  );
}
