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
      ? {
          src: product.defaultImage.url.replace('{:size}', '500x500'),
          alt: product.defaultImage.altText,
        }
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
    <div className="min-h-screen">
      {/* Hero Section with gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-screen-2xl px-4 py-16 text-center md:py-24">
          <div className="inline-block rounded-full bg-primary/10 px-4 py-2 mb-6">
            <span className="text-sm font-semibold text-primary uppercase tracking-wide">
              {t('heroTitle')}
            </span>
          </div>
          <h1 className="mb-6 text-5xl font-bold md:text-6xl lg:text-7xl">
            Exclusive Deals & Promotions
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-foreground/70 md:text-xl">
            {t('heroDescription')}
          </p>
          <a
            href="#products"
            className="inline-block rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            {t('shopNow')}
          </a>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Products Section */}
      <div id="products" className="mx-auto max-w-screen-2xl px-4 py-16">
        {products.length > 0 ? (
          <>
            <div className="mb-12 flex items-center justify-between">
              <div>
                <h2 className="mb-2 text-3xl font-bold md:text-4xl">
                  {t('flashSaleTitle')}
                </h2>
                <p className="text-foreground/70">{t('flashSaleDescription')}</p>
              </div>
              <div className="hidden md:block">
                <div className="rounded-lg bg-primary/10 px-6 py-3">
                  <span className="text-sm font-semibold text-primary">
                    {products.length} {products.length === 1 ? 'Product' : 'Products'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
              {products.map((product) => {
                // Calculate discount percentage if both prices exist
                let discountPercent = 0;
                if (product.price?.basePrice && product.price?.salePrice) {
                  const base = parseFloat(product.price.basePrice.replace(/[^0-9.]/g, ''));
                  const sale = parseFloat(product.price.salePrice.replace(/[^0-9.]/g, ''));
                  if (base > sale) {
                    discountPercent = Math.round(((base - sale) / base) * 100);
                  }
                }

                return (
                  <div
                    key={product.id}
                    className="group relative overflow-hidden rounded-xl border border-contrast-200 bg-background transition-shadow hover:shadow-lg"
                  >
                    <a className="block" href={product.href}>
                      {product.image && (
                        <div className="relative aspect-square overflow-hidden bg-contrast-100">
                          <img
                            alt={product.image.alt}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            src={product.image.src}
                          />
                          {/* Discount badge */}
                          {discountPercent > 0 && (
                            <div className="absolute right-2 top-2 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                              -{discountPercent}%
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="mb-2 line-clamp-2 font-semibold text-foreground group-hover:text-primary">
                          {product.title}
                        </h3>
                        {product.subtitle && (
                          <p className="mb-3 text-sm text-foreground/60">{product.subtitle}</p>
                        )}
                        {product.price && (
                          <div className="flex flex-col gap-1">
                            {product.price.salePrice ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-bold text-primary">
                                    {product.price.salePrice}
                                  </span>
                                  {product.price.basePrice && (
                                    <span className="text-sm text-foreground/50 line-through">
                                      {product.price.basePrice}
                                    </span>
                                  )}
                                </div>
                                {discountPercent > 0 && (
                                  <span className="text-xs font-semibold text-green-600">
                                    Save {discountPercent}%
                                  </span>
                                )}
                              </>
                            ) : (
                              product.price.basePrice && (
                                <span className="text-xl font-bold">{product.price.basePrice}</span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-contrast-200 py-20 text-center">
            <div className="mx-auto max-w-md">
              <div className="mb-4 text-6xl">🎉</div>
              <h3 className="mb-2 text-2xl font-bold">Check Back Soon!</h3>
              <p className="mb-6 text-foreground/60">
                No sale products available at this time. New promotions are coming soon!
              </p>
              <a
                href="/"
                className="inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                {t('exploreCatalog')}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
