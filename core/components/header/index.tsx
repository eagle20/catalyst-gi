import { getLocale, getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { Streamable } from '@/vibes/soul/lib/streamable';
import { GetLinksAndSectionsQuery, LayoutQuery } from '~/app/[locale]/(default)/page-data';
import { getSessionCustomerAccessToken, isLoggedIn } from '~/auth';
import { client } from '~/client';
import { graphql, readFragment } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import { TAGS } from '~/client/tags';
import { logoTransformer } from '~/data-transformers/logo-transformer';
import { getLocaleRouting } from '~/i18n/locale-config';
import { generateSSOUrl } from '~/lib/b2b/sso';
import { getCartId } from '~/lib/cart';
import { getPreferredCurrencyCode } from '~/lib/currency';
import { SiteHeader as HeaderSection } from '~/lib/makeswift/components/site-header';
import { getUser, isB2BCustomer } from '~/lib/user';

import { search } from './_actions/search';
import { switchCurrency } from './_actions/switch-currency';
import { switchLocale } from './_actions/switch-locale';
import { CurrencyCode, HeaderFragment, HeaderLinksFragment } from './fragment';

const GetCartCountQuery = graphql(`
  query GetCartCountQuery($cartId: String) {
    site {
      cart(entityId: $cartId) {
        entityId
        lineItems {
          totalQuantity
        }
      }
    }
  }
`);

const getCartCount = cache(async (cartId: string, customerAccessToken?: string) => {
  const response = await client.fetch({
    document: GetCartCountQuery,
    variables: { cartId },
    customerAccessToken,
    fetchOptions: {
      cache: 'no-store',
      next: {
        tags: [TAGS.cart],
      },
    },
  });

  return response.data.site.cart?.lineItems.totalQuantity ?? null;
});

const getHeaderLinks = cache(async (customerAccessToken?: string, currencyCode?: CurrencyCode) => {
  const { data: response } = await client.fetch({
    document: GetLinksAndSectionsQuery,
    customerAccessToken,
    variables: { currencyCode },
    // Since this query is needed on every page, it's a good idea not to validate the customer access token.
    // The 'cache' function also caches errors, so we might get caught in a redirect loop if the cache saves an invalid token error response.
    validateCustomerAccessToken: false,
    fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate } },
  });

  return readFragment(HeaderLinksFragment, response).site;
});

const getHeaderData = cache(async () => {
  const { data: response } = await client.fetch({
    document: LayoutQuery,
    fetchOptions: { next: { revalidate } },
  });

  return readFragment(HeaderFragment, response).site;
});

export const Header = async () => {
  const t = await getTranslations('Components.Header');
  const locale = await getLocale();

  const data = await getHeaderData();

  const logo = data.settings ? logoTransformer(data.settings) : '';

  const localeRouting = await getLocaleRouting();

  const locales = localeRouting.locales.map((enabledLocales) => ({
    id: enabledLocales,
    label: enabledLocales.toLocaleUpperCase(),
  }));

  const currencies = data.currencies.edges
    ? data.currencies.edges
        // only show transactional currencies for now until cart prices can be rendered in display currencies
        .filter(({ node }) => node.isTransactional)
        .map(({ node }) => ({
          id: node.code,
          label: node.code,
          isDefault: node.isDefault,
        }))
    : [];

  const streamableLinks = Streamable.from(async () => {
    const [customerAccessToken, currencyCode] = await Promise.all([
      getSessionCustomerAccessToken(),
      getPreferredCurrencyCode(),
    ]);
    // const customerAccessToken = await getSessionCustomerAccessToken();
    // const currencyCode = await getPreferredCurrencyCode();
    const categoryTree = (await getHeaderLinks(customerAccessToken, currencyCode)).categoryTree;

    // GI: show every top-level category (no 6-category limit), with its image.
    return categoryTree.map(({ name, path, children, image }) => ({
      label: name,
      href: path,
      image: image?.url,
      groups: children.map((firstChild) => ({
        label: firstChild.name,
        href: firstChild.path,
        links: firstChild.children.map((secondChild) => ({
          label: secondChild.name,
          href: secondChild.path,
        })),
      })),
    }));
  });

  const streamableGiftCertificatesEnabled = Streamable.from(async () => {
    const [customerAccessToken, currencyCode] = await Promise.all([
      getSessionCustomerAccessToken(),
      getPreferredCurrencyCode(),
    ]);
    const giftCertificateSettings = (await getHeaderLinks(customerAccessToken, currencyCode))
      .settings?.giftCertificates;

    return giftCertificateSettings?.isEnabled ?? false;
  });

  const streamableCartCount = Streamable.from(async () => {
    const cartId = await getCartId();
    const customerAccessToken = await getSessionCustomerAccessToken();

    if (!cartId) {
      return null;
    }

    return getCartCount(cartId, customerAccessToken);
  });

  const streamableActiveCurrencyId = Streamable.from(async (): Promise<string | undefined> => {
    const currencyCode = await getPreferredCurrencyCode();

    const defaultCurrency = currencies.find(({ isDefault }) => isDefault);

    return currencyCode ?? defaultCurrency?.id;
  });

  // GI: B2B Portal dashboard link (SSO) for logged-in B2B customers.
  const portalBase = process.env.B2B_PORTAL_URL ?? '';
  const user = await getUser();
  const portalDashboardUrl =
    user?.email && portalBase ? generateSSOUrl(user.email, portalBase, '/dashboard') : undefined;

  return (
    <HeaderSection
      navigation={{
        accountHref: '/login',
        accountLabel: t('Icons.account'),
        cartHref: '/cart',
        cartLabel: t('Icons.cart'),
        giftCertificatesLabel: t('Icons.giftCertificates'),
        giftCertificatesHref: '/gift-certificates',
        giftCertificatesEnabled: streamableGiftCertificatesEnabled,
        searchHref: '/search',
        searchParamName: 'term',
        searchAction: search,
        searchInputPlaceholder: t('Search.inputPlaceholder'),
        searchSubmitLabel: t('Search.submitLabel'),
        links: streamableLinks,
        logo,
        mobileMenuTriggerLabel: t('toggleNavigation'),
        openSearchPopupLabel: t('Icons.search'),
        logoLabel: t('home'),
        cartCount: streamableCartCount,
        isLoggedIn: Streamable.from(isLoggedIn),
        user: Streamable.from(getUser),
        isB2B: Streamable.from(isB2BCustomer),
        portalDashboardUrl,
        activeLocaleId: locale,
        locales,
        localeAction: switchLocale,
        currencies,
        activeCurrencyId: streamableActiveCurrencyId,
        currencyAction: switchCurrency,
        switchCurrencyLabel: t('SwitchCurrency.label'),
      }}
    />
  );
};
