import { getSiteVersion } from '@makeswift/runtime/next/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { clsx } from 'clsx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { cache, PropsWithChildren } from 'react';

import '../../globals.css';

import { fonts } from '~/app/fonts';
import { CookieNotifications } from '~/app/notifications';
import { Providers } from '~/app/providers';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import { WebAnalyticsFragment } from '~/components/analytics/fragment';
import { AnalyticsProvider } from '~/components/analytics/provider';
import { ConsentManager } from '~/components/consent-manager';
import { ScriptsFragment } from '~/components/consent-manager/scripts-fragment';
import { ContainerQueryPolyfill } from '~/components/polyfills/container-query';
import { scriptsTransformer } from '~/data-transformers/scripts-transformer';
import { getLocaleRouting } from '~/i18n/locale-config';
import { LocaleRoutingProvider } from '~/i18n/locale-routing-provider';
import { isAnalyticsDisabled } from '~/lib/analytics/is-analytics-disabled';
import { SiteTheme } from '~/lib/makeswift/components/site-theme';
import { MakeswiftProvider } from '~/lib/makeswift/provider';
import { getToastNotification } from '~/lib/server-toast';

import { B2BCartProvider } from '~/components/b2b/cart-context';
import { B2BCartDrawer } from '~/components/b2b/cart-drawer';
import { B2BProvider } from '~/components/b2b/provider';

import '~/lib/makeswift/components';

const RootLayoutMetadataQuery = graphql(
  `
    query RootLayoutMetadataQuery {
      site {
        settings {
          url {
            vanityUrl
          }
          privacy {
            cookieConsentEnabled
            privacyPolicyUrl
          }
          storeName
          seo {
            pageTitle
            metaDescription
            metaKeywords
          }
          ...WebAnalyticsFragment
        }
        content {
          ...ScriptsFragment
        }
      }
      channel {
        entityId
      }
    }
  `,
  [WebAnalyticsFragment, ScriptsFragment],
);

const fetchRootLayoutMetadata = cache(async () => {
  return await client.fetch({
    document: RootLayoutMetadataQuery,
    fetchOptions: { next: { revalidate } },
  });
});

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await fetchRootLayoutMetadata();

  const storeName = data.site.settings?.storeName ?? '';

  const { pageTitle, metaDescription, metaKeywords } = data.site.settings?.seo || {};

  const defaultTitle =
    pageTitle && pageTitle.length >= 10 && pageTitle.length <= 60
      ? pageTitle
      : `${storeName} - Quality Products & Service`;
  const defaultDescription =
    metaDescription && metaDescription.length <= 160
      ? metaDescription
      : `${storeName} offers a curated selection of quality products and outstanding service. Discover our range today!`;

  const vanityUrl = data.site.settings?.url.vanityUrl;

  // Use preview deployment URL so metadataBase (canonical, og:url) points at the preview, not production.
  let baseUrl: URL | undefined;
  const previewUrl =
    process.env.VERCEL_ENV === 'preview' ? `https://${process.env.VERCEL_URL}` : undefined;

  if (previewUrl && URL.canParse(previewUrl)) {
    baseUrl = new URL(previewUrl);
  } else if (vanityUrl && URL.canParse(vanityUrl)) {
    baseUrl = new URL(vanityUrl);
  }

  return {
    metadataBase: baseUrl,
    title: {
      template: `%s - ${storeName}`,
      default: defaultTitle,
    },
    description: defaultDescription,
    icons: {
      icon: '/favicon.ico',
    },
    keywords: metaKeywords ? metaKeywords.split(',') : null,
    openGraph: {
      title: defaultTitle,
      description: defaultDescription,
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://gitool.com',
      siteName: storeName,
      images: [
        {
          url: process.env.NEXT_PUBLIC_OG_IMAGE || '/favicon.ico',
          alt: `${storeName} Logo`,
        },
      ],
    },
    other: {
      platform: 'bigcommerce.catalyst',
      build_sha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? '',
      store_hash: process.env.BIGCOMMERCE_STORE_HASH ?? '',
      channel_id: data.channel.entityId,
      hosting: process.env.CATALYST_HOSTING ?? (process.env.VERCEL ? 'vercel' : 'other'),
    },
  };
}

const VercelComponents = () => {
  if (process.env.VERCEL !== '1' || isAnalyticsDisabled()) {
    return null;
  }

  return (
    <>
      {process.env.DISABLE_VERCEL_ANALYTICS !== 'true' && <Analytics />}
      {process.env.DISABLE_VERCEL_SPEED_INSIGHTS !== 'true' && <SpeedInsights />}
    </>
  );
};

interface Props extends PropsWithChildren {
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({ params, children }: Props) {
  const { locale } = await params;

  const rootData = await fetchRootLayoutMetadata();
  const toastNotificationCookieData = await getToastNotification();
  const siteVersion = await getSiteVersion();

  const localeRouting = await getLocaleRouting();

  if (!localeRouting.locales.includes(locale)) {
    notFound();
  }

  // SEO values for Schema.org injection
  const { data } = await client.fetch({
    document: RootLayoutMetadataQuery,
    fetchOptions: { next: { revalidate } },
  });
  const storeName = data.site.settings?.storeName ?? '';
  const metaDescription = data.site.settings?.seo?.metaDescription;
  const defaultDescription =
    metaDescription && metaDescription.length <= 160
      ? metaDescription
      : `${storeName} offers a curated selection of quality products and outstanding service. Discover our range today!`;

  // need to call this method everywhere where static rendering is enabled
  setRequestLocale(locale);

  const scripts = scriptsTransformer(rootData.data.site.content.scripts);
  const isCookieConsentEnabled =
    rootData.data.site.settings?.privacy?.cookieConsentEnabled ?? false;
  const privacyPolicyUrl = rootData.data.site.settings?.privacy?.privacyPolicyUrl;

  return (
    <MakeswiftProvider locale={locale} siteVersion={siteVersion}>
      <html className={clsx(fonts.map((f) => f.variable))} lang={locale}>
        <head>
          <SiteTheme />
          {/* Schema.org Organization structured data for SEO */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: storeName,
                url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
                logo: process.env.NEXT_PUBLIC_OG_IMAGE || '/favicon.ico',
                description: defaultDescription,
              }),
            }}
          />
          {/* Lucky Orange tracking */}
          <script async defer src="https://tools.luckyorange.com/core/lo.js?site-id=a83f895c" />
        </head>
        <body className="flex min-h-screen flex-col">
          <NextIntlClientProvider>
            <LocaleRoutingProvider localeRouting={localeRouting}>
              <ConsentManager
                isCookieConsentEnabled={isCookieConsentEnabled}
                privacyPolicyUrl={privacyPolicyUrl}
                scripts={scripts}
              >
                <NuqsAdapter>
                  <AnalyticsProvider
                    channelId={rootData.data.channel.entityId}
                    isCookieConsentEnabled={isCookieConsentEnabled}
                    settings={isAnalyticsDisabled() ? null : rootData.data.site.settings}
                  >
                    <Providers>
                      {toastNotificationCookieData && (
                        <CookieNotifications {...toastNotificationCookieData} />
                      )}
                      {/* GI: B2B cart and B2B customer context */}
                      <B2BCartProvider>
                        <B2BProvider>{children}</B2BProvider>
                        <B2BCartDrawer />
                      </B2BCartProvider>
                    </Providers>
                  </AnalyticsProvider>
                </NuqsAdapter>
              </ConsentManager>
            </LocaleRoutingProvider>
          </NextIntlClientProvider>
          <VercelComponents />
          <ContainerQueryPolyfill />
        </body>
      </html>
    </MakeswiftProvider>
  );
}

// Intentionally no `generateStaticParams`: every route under `[locale]` already renders on demand
// (the tree reads cookies), so it would only add a build-time dependency on the locale list, and
// anything it did prerender would bake in stale subfolder prefixes.

export const fetchCache = 'default-cache';
