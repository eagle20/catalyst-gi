/* eslint-disable react/jsx-no-bind */
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ButtonLink } from '@/vibes/soul/primitives/button-link';
import { SignInSection } from '@/vibes/soul/sections/sign-in-section';
import { buildConfig } from '~/build-config/reader';
import { ForceRefresh } from '~/components/force-refresh';
import { redirect } from '~/i18n/navigation-server';
import { Slot } from '~/lib/makeswift/slot';
import { buildOpenGraph } from '~/lib/seo';

import { login } from './_actions/login';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
    action?: string;
    c?: string;
    t?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { redirectTo } = await searchParams;

  const t = await getTranslations({ locale, namespace: 'Auth.Login' });

  // GI: the header's Sign In link appends ?redirectTo=<current path> on every
  // page site-wide, so Google was crawling and indexing a distinct
  // /login?redirectTo=... URL per page on the whole catalog — all rendering
  // identical content, flagged in GSC as "Duplicate without user-selected
  // canonical." Canonical + nofollow on the link discourage/consolidate
  // this; noindex here is the hard guarantee that no ?redirectTo= variant
  // is ever indexable, regardless of how Google discovers it. The bare
  // /login (no redirectTo) stays indexable and canonical, as intended.
  const canonicalUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
    : 'https://gitool.com/login';

  return {
    title: t('title'),
    alternates: { canonical: canonicalUrl },
    openGraph: buildOpenGraph({ title: t('title'), path: '/login' }),
    ...(redirectTo && { robots: { index: false, follow: true } }),
  };
}

export default async function Login({ params, searchParams }: Props) {
  const { locale } = await params;
  const {
    redirectTo = '/account/orders',
    error,
    action,
    c: customerEntityId,
    t: token,
  } = await searchParams;

  setRequestLocale(locale);

  // BigCommerce emails the "set your password on next login" link in the legacy Stencil format
  // (`/login?action=change_password&c=<id>&t=<token>`), so forward it to the change password page.
  if (action === 'change_password' && customerEntityId && token) {
    const query = new URLSearchParams({ c: customerEntityId, t: token });

    return await redirect({ href: `/change-password?${query.toString()}`, locale });
  }

  const t = await getTranslations('Auth.Login');

  const vanityUrl = buildConfig.get('urls').vanityUrl;
  const redirectUrl = new URL(redirectTo, vanityUrl);
  const redirectTarget = redirectUrl.pathname + redirectUrl.search;
  const tokenErrorMessage = error === 'InvalidToken' ? t('invalidToken') : undefined;

  return (
    <>
      <ForceRefresh />
      <SignInSection
        action={login.bind(null, { redirectTo: redirectTarget })}
        emailLabel={t('email')}
        error={tokenErrorMessage}
        forgotPasswordHref="/login/forgot-password"
        forgotPasswordLabel={t('forgotPassword')}
        passwordLabel={t('password')}
        submitLabel={t('cta')}
        title={t('heading')}
      >
        <Slot
          fallback={
            <div className="font-[family-name:var(--sign-in-font-family,var(--font-family-body))]">
              <h2 className="mb-10 font-[family-name:var(--sign-in-title-font-family,var(--font-family-heading))] text-4xl font-medium leading-none text-[var(--reset-password-title,hsl(var(--foreground)))] @xl:text-5xl">
                {t('CreateAccount.title')}
              </h2>
              <div className="text-[var(--sign-in-description,hsl(var(--contrast-500)))]">
                <p>{t('CreateAccount.accountBenefits')}</p>
                <ul className="mb-10 ml-4 mt-4 list-disc">
                  <li>{t('CreateAccount.fastCheckout')}</li>
                  <li>{t('CreateAccount.multipleAddresses')}</li>
                  <li>{t('CreateAccount.ordersHistory')}</li>
                  <li>{t('CreateAccount.ordersTracking')}</li>
                  <li>{t('CreateAccount.wishlists')}</li>
                </ul>
                <ButtonLink className="mt-auto w-full" href="/register" variant="secondary">
                  {t('CreateAccount.cta')}
                </ButtonLink>
              </div>
            </div>
          }
          label="Login sidebar content"
          snapshotId="login-sidebar-content"
        />
      </SignInSection>
    </>
  );
}
