import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PropsWithChildren } from 'react';

import { SidebarMenu } from '@/vibes/soul/sections/sidebar-menu';
import { StickySidebarLayout } from '@/vibes/soul/sections/sticky-sidebar-layout';
import { isLoggedIn } from '~/auth';
import { redirect } from '~/i18n/routing';

interface Props extends PropsWithChildren {
  params: Promise<{ locale: string }>;
}

export default async function Layout({ children, params }: Props) {
  const { locale } = await params;
  const loggedIn = await isLoggedIn();

  setRequestLocale(locale);

  const t = await getTranslations('Account.Layout');

  if (!loggedIn) {
    redirect({ href: '/login', locale });
  }

  return (
    <StickySidebarLayout
      sidebar={
        <div className="flex flex-col">
          <SidebarMenu
            links={[
              { href: '/account/orders', label: t('orders') },
              { href: '/account/addresses', label: t('addresses') },
              { href: '/account/settings', label: t('settings') },
              { href: '/account/wishlists', label: t('wishlists') },
            ]}
          />
          {/* Full-page navigation required so the session is cleared before re-render */}
          <a
            className="flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-red-600 hover:bg-contrast-100"
            href="/logout"
          >
            {t('logout')}
          </a>
        </div>
      }
      sidebarSize="small"
    >
      {children}
    </StickySidebarLayout>
  );
}
