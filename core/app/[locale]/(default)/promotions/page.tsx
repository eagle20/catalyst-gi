import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { ProductCardFragment } from '~/components/product-card/fragment';
import { pricesTransformer } from '~/data-transformers/prices-transformer';
import { getPreferredCurrencyCode } from '~/lib/currency';

interface ProductImage {
  src: string;
  alt: string;
}

interface ProductPrice {
  basePrice?: string;
  salePrice?: string;
}

interface Product {
  id: string;
  title: string;
  href: string;
  image?: ProductImage;
  price?: ProductPrice;
  subtitle?: string;
  description?: string;
  categories?: string[];
}

const GetPromotionsProducts = graphql(
  `
    query GetPromotionsProducts($first: Int, $currencyCode: currencyCode) {
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

export const metadata: Metadata = {
  title: 'Promotions & Deals',
  description: 'Discover amazing deals and limited-time offers on our best products',
};

async function getPromotionsProducts(): Promise<Product[]> {
  const customerAccessToken = await getSessionCustomerAccessToken();
  const format = await getFormatter();
  const currencyCode = await getPreferredCurrencyCode();

  const { data } = await client.fetch({
    document: GetPromotionsProducts,
    variables: { first: 24, currencyCode },
    customerAccessToken,
  });

  const allProducts = removeEdgesAndNodes(data.site.products);

  // Temporarily show all products to debug price structure
  // TODO: Re-enable sale price filtering once we understand the data
  // const saleProducts = allProducts.filter((product) => {
  //   const prices = product.prices;
  //   if (!prices) return false;
  //
  //   const basePrice = prices.basePrice?.value;
  //   const salePrice = prices.salePrice?.value ?? prices.price.value;
  //
  //   return basePrice && salePrice && salePrice < basePrice;
  // });

  return allProducts.map((product) => ({
    id: product.entityId.toString(),
    title: product.name,
    href: product.path,
    image: product.defaultImage
      ? { src: product.defaultImage.url, alt: product.defaultImage.altText }
      : undefined,
    price: pricesTransformer(product.prices, format),
    subtitle: product.brand?.name ?? undefined,
    description: product.description ?? '',
    categories: product.categories?.edges?.map((edge) => edge.node.name) ?? [],
  }));
}

export default async function PromotionsPage() {
  const t = await getTranslations('Promotions');
  const products = await getPromotionsProducts();

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-10">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{t('heroTitle')}</h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-foreground/70">
          {t('heroDescription')}
        </p>
      </div>

      {/* Products Section */}
      {products.length > 0 ? (
        <div>
          <h2 className="mb-6 text-2xl font-bold">{t('flashSaleTitle')}</h2>
          <p className="mb-8 text-foreground/70">{t('flashSaleDescription')}</p>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="group">
                <a className="block" href={product.href}>
                  {product.image && (
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-contrast-100">
                      <img
                        alt={product.image.alt}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        src={product.image.src}
                      />
                    </div>
                  )}
                  <h3 className="mb-1 font-medium">{product.title}</h3>
                  {product.subtitle && (
                    <p className="mb-2 text-sm text-foreground/60">{product.subtitle}</p>
                  )}
                  {product.price && (
                    <div className="flex items-baseline gap-2">
                      {product.price.salePrice && (
                        <>
                          <span className="font-semibold text-primary">
                            {product.price.salePrice}
                          </span>
                          {product.price.basePrice && (
                            <span className="text-sm text-foreground/60 line-through">
                              {product.price.basePrice}
                            </span>
                          )}
                        </>
                      )}
                      {!product.price.salePrice && product.price.basePrice && (
                        <span className="font-semibold">{product.price.basePrice}</span>
                      )}
                    </div>
                  )}
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-foreground/60">No sale products available at this time.</p>
          <p className="mt-2 text-foreground/50">Check back soon for amazing deals!</p>
        </div>
      )}
    </div>
  );
}
