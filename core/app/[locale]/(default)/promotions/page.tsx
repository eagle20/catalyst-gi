import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { getTranslations } from 'next-intl/server';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { ProductCard } from '~/components/product-card';
import { ProductCardFragment } from '~/components/product-card/fragment';

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

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-10">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{t('heroTitle')}</h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-600">{t('heroDescription')}</p>
      </div>

      {/* Products Grid */}
      {saleProducts.length > 0 ? (
        <div>
          <h2 className="mb-6 text-2xl font-bold">{t('flashSaleTitle')}</h2>
          <p className="mb-8 text-gray-600">{t('flashSaleDescription')}</p>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {saleProducts.map((product, index) => (
              <ProductCard
                imagePriority={index <= 3}
                imageSize="wide"
                key={product.entityId}
                product={product}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-600">No sale products available at this time.</p>
        </div>
      )}
    </div>
  );
}

export const runtime = 'edge';
