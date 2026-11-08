import createWithMakeswift from '@makeswift/runtime/next/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { writeBuildConfig } from './build-config/writer';
import { client } from './client';
import { graphql } from './client/graphql';
import { cspHeader } from './lib/content-security-policy';

const withMakeswift = createWithMakeswift({
  appOrigin: process.env.NEXT_PUBLIC_MAKESWIFT_APP_ORIGIN ?? process.env.MAKESWIFT_APP_ORIGIN,
});
const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: './messages/en.json',
  },
});

const SettingsQuery = graphql(`
  query SettingsQuery {
    site {
      settings {
        url {
          vanityUrl
          cdnUrl
          checkoutUrl
        }
      }
    }
  }
`);

async function writeSettingsToBuildConfig() {
  const { data } = await client.fetch({ document: SettingsQuery });

  const cdnEnvHostnames = process.env.NEXT_PUBLIC_BIGCOMMERCE_CDN_HOSTNAME;

  const cdnUrls = (
    cdnEnvHostnames
      ? cdnEnvHostnames.split(',').map((s) => s.trim())
      : [data.site.settings?.url.cdnUrl]
  ).filter((url): url is string => !!url);

  if (!cdnUrls.length) {
    throw new Error(
      'No CDN URLs found. Please ensure that NEXT_PUBLIC_BIGCOMMERCE_CDN_HOSTNAME is set correctly.',
    );
  }

  return await writeBuildConfig({
    urls: {
      ...data.site.settings?.url,
      cdnUrls,
    },
  });
}

export default async (): Promise<NextConfig> => {
  const settings = await writeSettingsToBuildConfig();

  let nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
      optimizePackageImports: ['@icons-pack/react-simple-icons'],
    },
    images: {
      // Allow product-video poster thumbnails (YouTube) through next/image.
      remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' }],
    },
    typescript: {
      // GI: the codebase has known type errors (see TYPESCRIPT_ERRORS.md); don't block deploys on them.
      ignoreBuildErrors: true,
    },
    // default URL generation in BigCommerce uses trailing slash
    trailingSlash: process.env.TRAILING_SLASH !== 'false',
    async rewrites() {
      return [
        {
          source: '/login.php',
          destination: '/login',
        },
      ];
    },
    async redirects() {
      return [
        {
          source: '/shop',
          destination: '/categories',
          permanent: true,
        },
        {
          // Redirect es-MX URLs to English equivalents — BigCommerce sitemap
          // generates these URLs but the catalog has no Spanish translations,
          // causing 404s for users clicking through from Google. Permanent
          // (308) so GSC actually consolidates/clears these URLs from the
          // index instead of continuing to treat the redirect as reversible.
          source: '/es-MX/:path*',
          destination: '/:path*',
          permanent: true,
        },
      ];
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async headers() {
      const cdnLinks = settings.urls.cdnUrls.map((url) => ({
        key: 'Link',
        value: `<https://${url}>; rel=preconnect`,
      }));

      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: cspHeader.replace(/\n/g, ''),
            },
            ...cdnLinks,
          ],
        },
      ];
    },
  };

  // Apply withNextIntl to the config
  nextConfig = withNextIntl(nextConfig);

  // Apply withMakeswift to the config
  nextConfig = withMakeswift(nextConfig);

  if (process.env.ANALYZE === 'true') {
    const withBundleAnalyzer = bundleAnalyzer();

    nextConfig = withBundleAnalyzer(nextConfig);
  }

  return nextConfig;
};
