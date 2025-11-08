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

  // Categorize products by deal type (this is a placeholder - you'll need to add actual categorization logic)
  const bigDiscounts = products.slice(0, 8);
  const couponDeals = products.slice(8, 16);
  const toolBundles = products.slice(16, 24);

  return (
    <div className="bg-background">
      {/* Hero Banner - Large promotional banner */}
      <div className="relative bg-red-600 text-white">
        <div className="mx-auto max-w-screen-2xl px-4 py-12 md:py-20">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-3 inline-block rounded bg-white px-3 py-1 text-sm font-bold uppercase tracking-wide text-red-600">
                Limited Time Offer
              </div>
              <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                Save Big on Power Tools & More
              </h1>
              <p className="mb-6 text-lg text-red-50 md:text-xl">
                Exclusive deals on top brands. Free batteries, huge discounts, and special bundles.
              </p>
              <a
                href="#deals"
                className="inline-block rounded bg-white px-8 py-4 font-bold text-red-600 transition hover:bg-red-50"
              >
                Shop All Deals
              </a>
            </div>
            <div className="hidden md:block">
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur">
                <div className="text-center">
                  <div className="mb-2 text-5xl font-bold">UP TO</div>
                  <div className="mb-2 text-7xl font-bold">50% OFF</div>
                  <div className="text-xl">Select Power Tools</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Deals Content */}
      <div id="deals" className="mx-auto max-w-screen-2xl px-4 py-12">
        {/* Section 1: Big Discounts */}
        <section className="mb-16">
          <div className="mb-8 border-b-4 border-red-600 pb-4">
            <h2 className="text-3xl font-bold">Big Discounts Off List Price</h2>
            <p className="mt-2 text-foreground/70">
              Save up to 50% on select tools and equipment. No codes needed - discount applied
              automatically.
            </p>
          </div>

          {bigDiscounts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {bigDiscounts.map((product) => {
                let discountPercent = 0;
                if (product.price?.basePrice && product.price?.salePrice) {
                  const base = parseFloat(product.price.basePrice.replace(/[^0-9.]/g, ''));
                  const sale = parseFloat(product.price.salePrice.replace(/[^0-9.]/g, ''));
                  if (base > sale) {
                    discountPercent = Math.round(((base - sale) / base) * 100);
                  }
                }

                return (
                  <a
                    key={product.id}
                    href={product.href}
                    className="group block rounded border border-contrast-200 bg-white transition hover:shadow-lg"
                  >
                    {product.image && (
                      <div className="relative overflow-hidden bg-contrast-100">
                        <img
                          alt={product.image.alt}
                          className="aspect-square w-full object-cover"
                          src={product.image.src}
                        />
                        {discountPercent > 0 && (
                          <div className="absolute left-0 top-0 bg-red-600 px-3 py-2 font-bold text-white">
                            SAVE {discountPercent}%
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="mb-2 line-clamp-2 text-sm font-medium">{product.title}</h3>
                      {product.subtitle && (
                        <p className="mb-2 text-xs text-foreground/60">{product.subtitle}</p>
                      )}
                      {product.price && (
                        <div>
                          {product.price.salePrice && (
                            <div className="mb-1 flex items-baseline gap-2">
                              <span className="text-xl font-bold text-red-600">
                                {product.price.salePrice}
                              </span>
                              {product.price.basePrice && (
                                <span className="text-sm text-foreground/50 line-through">
                                  {product.price.basePrice}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-foreground/60">No discounted items at this time.</p>
          )}
        </section>

        {/* Section 2: Coupon Deals */}
        <section className="mb-16">
          <div className="mb-8 border-b-4 border-blue-600 pb-4">
            <h2 className="text-3xl font-bold">Apply Coupon in Cart</h2>
            <p className="mt-2 text-foreground/70">
              Use promo codes at checkout for additional savings. Codes automatically applied when
              available.
            </p>
          </div>

          {couponDeals.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {couponDeals.map((product) => (
                <a
                  key={product.id}
                  href={product.href}
                  className="group block rounded border border-contrast-200 bg-white transition hover:shadow-lg"
                >
                  {product.image && (
                    <div className="relative overflow-hidden bg-contrast-100">
                      <img
                        alt={product.image.alt}
                        className="aspect-square w-full object-cover"
                        src={product.image.src}
                      />
                      <div className="absolute left-0 top-0 bg-blue-600 px-3 py-2 text-xs font-bold text-white">
                        COUPON AVAILABLE
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-medium">{product.title}</h3>
                    {product.subtitle && (
                      <p className="mb-2 text-xs text-foreground/60">{product.subtitle}</p>
                    )}
                    {product.price?.basePrice && (
                      <div className="text-lg font-bold">{product.price.basePrice}</div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-foreground/60">No coupon deals at this time.</p>
          )}
        </section>

        {/* Section 3: Free Battery with Tool */}
        <section className="mb-16">
          <div className="mb-8 border-b-4 border-green-600 pb-4">
            <h2 className="text-3xl font-bold">Free Battery with Tool Purchase</h2>
            <p className="mt-2 text-foreground/70">
              Buy select power tools and get a free battery. Maximize your value and keep working
              longer.
            </p>
          </div>

          {toolBundles.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {toolBundles.map((product) => (
                <a
                  key={product.id}
                  href={product.href}
                  className="group block rounded border border-contrast-200 bg-white transition hover:shadow-lg"
                >
                  {product.image && (
                    <div className="relative overflow-hidden bg-contrast-100">
                      <img
                        alt={product.image.alt}
                        className="aspect-square w-full object-cover"
                        src={product.image.src}
                      />
                      <div className="absolute left-0 top-0 bg-green-600 px-3 py-2 text-xs font-bold text-white">
                        FREE BATTERY
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-medium">{product.title}</h3>
                    {product.subtitle && (
                      <p className="mb-2 text-xs text-foreground/60">{product.subtitle}</p>
                    )}
                    {product.price?.basePrice && (
                      <div className="text-lg font-bold">{product.price.basePrice}</div>
                    )}
                    <div className="mt-1 text-xs font-semibold text-green-600">
                      + Free Battery Included
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-foreground/60">
              No battery bundle deals at this time.
            </p>
          )}
        </section>

        {/* Section 4: Free Tool with Battery */}
        <section className="mb-16">
          <div className="mb-8 border-b-4 border-orange-600 pb-4">
            <h2 className="text-3xl font-bold">Free Tool with Battery Purchase</h2>
            <p className="mt-2 text-foreground/70">
              Expand your collection. Buy select batteries and get a free tool to go with it.
            </p>
          </div>

          <p className="py-8 text-center text-foreground/60">
            Check back soon for battery + free tool offers!
          </p>
        </section>
      </div>
    </div>
  );
}
