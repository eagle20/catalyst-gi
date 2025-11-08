import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { getTranslations } from 'next-intl/server';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { ProductCardFragment } from '~/components/product-card/fragment';
import { FlashSale } from '~/vibes/soul/sections/flash-sale';
import { PromoBanner } from '~/vibes/soul/sections/promo-banner';

const GetPromotionsProducts = graphql(
  `
    query GetPromotionsProducts($first: Int) {
      site {
        products(first: $first, hideOutOfStock: false) {
          edges {
            node {
              ...ProductCardFragment
            }
          }
        }
      }
    }
  `,
  [ProductCardFragment],
);

export async function generateMetadata() {
  const t = await getTranslations('Promotions');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PromotionsPage() {
  const t = await getTranslations('Promotions');
  const customerAccessToken = await getSessionCustomerAccessToken();

  const { data } = await client.fetch({
    document: GetPromotionsProducts,
    variables: { first: 24 },
    customerAccessToken,
  });

  const allProducts = removeEdgesAndNodes(data.site.products);

  // Filter to only products with sale prices
  const saleProducts = allProducts.filter((product) => {
    const prices = product.prices;
    if (!prices) return false;

    const basePrice = prices.basePrice?.value;
    const salePrice = prices.salePrice?.value ?? prices.price.value;

    return basePrice && salePrice && salePrice < basePrice;
  });

  // Calculate flash sale end date (7 days from now for demo)
  const flashSaleEndDate = new Date();
  flashSaleEndDate.setDate(flashSaleEndDate.getDate() + 7);

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Promo Banner */}
      <PromoBanner
        backgroundColor="bg-primary"
        ctaHref="/promotions"
        ctaLabel={t('shopNow')}
        description={t('heroDescription')}
        size="large"
        textColor="light"
        title={t('heroTitle')}
      />

      {/* Flash Sale Section */}
      {saleProducts.length > 0 && (
        <FlashSale
          ctaHref="/search"
          ctaLabel={t('viewAllDeals')}
          description={t('flashSaleDescription')}
          endDate={flashSaleEndDate}
          products={saleProducts}
          timerSize="large"
          title={t('flashSaleTitle')}
        />
      )}

      {/* Secondary Promo Banner */}
      <PromoBanner
        backgroundColor="bg-contrast-100"
        ctaHref="/search"
        ctaLabel={t('exploreCatalog')}
        description={t('secondaryDescription')}
        size="medium"
        textColor="dark"
        title={t('secondaryTitle')}
      />
    </div>
  );
}

export const runtime = 'edge';
