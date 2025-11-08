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
  const featuredDeals = products.slice(0, 6);
  const trendingDeals = products.slice(6, 10);
  const moreDeals = products.slice(10, 20);

  return (
    <div className="bg-background">
      {/* Top Featured Deal Cards - Horizontal Scroll - COMPACT */}
      <div className="border-b border-contrast-200 bg-white">
        <div className="mx-auto max-w-screen-2xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide md:text-base">Today's Top Deals</h2>
            <a href="#all-deals" className="text-xs font-semibold text-primary hover:underline md:text-sm">
              SHOP ALL DEALS →
            </a>
          </div>
          <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {featuredDeals.map((product, idx) => {
              const colors = [
                'bg-yellow-500',
                'bg-green-700',
                'bg-red-600',
                'bg-red-700',
                'bg-yellow-400',
                'bg-blue-600',
              ];
              const dealTypes = [
                '2 FREE TOOLS',
                '4X THE POWER',
                'FREE BATTERY',
                'BUY ONE, GET ONE',
                'SAVE 14%',
                'FREE STARTER KIT',
              ];

              return (
                <a
                  key={product.id}
                  href={product.href}
                  className={`${colors[idx % colors.length]} group w-[140px] flex-shrink-0 overflow-hidden rounded-lg text-white transition hover:opacity-90 md:w-[160px]`}
                >
                  {product.image && (
                    <div className="p-3 pb-1">
                      <img
                        alt={product.image.alt}
                        className="aspect-square w-full rounded object-cover"
                        src={product.image.src}
                      />
                    </div>
                  )}
                  <div className="p-3 pt-1">
                    <div className="mb-0.5 text-[10px] font-bold uppercase leading-tight md:text-xs">
                      {dealTypes[idx % 6]}
                    </div>
                    <div className="line-clamp-2 text-[10px] leading-tight md:text-xs">{product.title}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trending Product Deals - Dynamic Mixed Grid Layout */}
      <div id="all-deals" className="mx-auto max-w-screen-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-red-600" />
          <h2 className="text-base font-bold uppercase tracking-wide md:text-lg">Trending Product Deals</h2>
        </div>

        {/* Dynamic grid with varied sizes: 1x1, 2x1, 1x2, 2x2 patterns */}
        <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {trendingDeals.map((product, idx) => {
            const badges = ['HOT DEAL', 'BEST SELLER', 'PRICE DROP', 'FLASH SALE'];
            const badgeColors = ['bg-red-600', 'bg-blue-600', 'bg-orange-500', 'bg-green-600'];

            // Dynamic grid spanning - creates visual variety
            // Pattern: Large, normal, wide, tall, normal, normal, large, wide...
            let gridSpan = '';
            if (idx === 0) {
              // First item: 2x2 featured
              gridSpan = 'md:col-span-2 md:row-span-2';
            } else if (idx === 2) {
              // Third item: 2x1 wide
              gridSpan = 'md:col-span-2';
            } else if (idx === 3) {
              // Fourth item: 1x2 tall
              gridSpan = 'md:row-span-2';
            } else if (idx === 6) {
              // Seventh item: 2x2 large
              gridSpan = 'md:col-span-2 md:row-span-2';
            } else if (idx === 8) {
              // Ninth item: 2x1 wide
              gridSpan = 'md:col-span-2';
            }
            // Rest are normal 1x1

            let discountPercent = 0;
            if (product.price?.basePrice && product.price?.salePrice) {
              const base = parseFloat(product.price.basePrice.replace(/[^0-9.]/g, ''));
              const sale = parseFloat(product.price.salePrice.replace(/[^0-9.]/g, ''));
              if (base > sale) {
                discountPercent = Math.round(((base - sale) / base) * 100);
              }
            }

            // Larger cards get more content
            const isLarge = gridSpan.includes('col-span-2') && gridSpan.includes('row-span-2');
            const isWide = gridSpan.includes('col-span-2') && !gridSpan.includes('row-span-2');

            return (
              <a
                key={product.id}
                href={product.href}
                className={`group relative block overflow-hidden rounded border border-contrast-200 bg-white transition hover:shadow-lg ${gridSpan}`}
              >
                {product.image && (
                  <div className="relative bg-contrast-100">
                    <img
                      alt={product.image.alt}
                      className="aspect-square w-full object-cover"
                      src={product.image.src}
                    />
                    {idx < badges.length && (
                      <div
                        className={`${badgeColors[idx % badgeColors.length]} absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-bold uppercase text-white md:text-xs`}
                      >
                        {badges[idx % badges.length]}
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <div className="absolute bottom-2 right-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg md:px-3 md:py-1.5 md:text-sm">
                        -{discountPercent}%
                      </div>
                    )}
                  </div>
                )}
                <div className={`p-2 md:p-3 ${isLarge ? 'md:p-4' : ''}`}>
                  {!isLarge && <div className="mb-1 text-[10px] text-foreground/50">SKU: {product.id}</div>}
                  <h3 className={`mb-2 line-clamp-2 font-medium leading-tight ${isLarge ? 'text-base md:text-lg' : 'text-xs md:text-sm'}`}>
                    {product.title}
                  </h3>
                  {product.subtitle && isLarge && (
                    <p className="mb-2 text-xs text-foreground/60">{product.subtitle}</p>
                  )}
                  {product.price && (
                    <div className="flex items-baseline gap-2">
                      <span className={`font-bold text-red-600 ${isLarge ? 'text-xl md:text-2xl' : 'text-base md:text-lg'}`}>
                        {product.price.salePrice || product.price.basePrice}
                      </span>
                      {product.price.salePrice && product.price.basePrice && (
                        <span className="text-xs text-foreground/40 line-through">
                          {product.price.basePrice}
                        </span>
                      )}
                    </div>
                  )}
                  <button className={`mt-2 w-full rounded border border-primary bg-white font-semibold text-primary transition hover:bg-primary hover:text-white ${isLarge ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'}`}>
                    + Add
                  </button>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* More Deals Section - Standard Grid */}
      <div className="bg-contrast-100 py-8">
        <div className="mx-auto max-w-screen-2xl px-4">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-green-600" />
            <h2 className="text-lg font-bold uppercase tracking-wide">More Great Deals</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {moreDeals.map((product) => {
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
                  className="group block overflow-hidden rounded border border-contrast-200 bg-white transition hover:shadow-lg"
                >
                  {product.image && (
                    <div className="relative bg-contrast-100">
                      <img
                        alt={product.image.alt}
                        className="aspect-square w-full object-cover"
                        src={product.image.src}
                      />
                      {discountPercent > 0 && (
                        <div className="absolute right-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                          {discountPercent}% OFF
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="mb-2 line-clamp-2 text-xs font-medium leading-tight">
                      {product.title}
                    </h3>
                    {product.price && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-bold">
                          {product.price.salePrice || product.price.basePrice}
                        </span>
                        {product.price.salePrice && product.price.basePrice && (
                          <span className="text-xs text-foreground/40 line-through">
                            {product.price.basePrice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Brand Banner Section */}
      <div className="mx-auto max-w-screen-2xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-lg bg-yellow-500">
            <div className="p-8 md:p-12">
              <div className="mb-4 text-4xl font-bold text-black">DEWALT</div>
              <div className="mb-2 text-2xl font-bold text-black">COMBO KITS</div>
              <div className="text-lg text-black/80">Save on complete tool sets</div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-lg bg-teal-600">
            <div className="p-8 md:p-12">
              <div className="mb-4 text-4xl font-bold text-white">Makita</div>
              <div className="mb-2 text-2xl font-bold text-white">CORDLESS SERIES</div>
              <div className="text-lg text-white/90">Professional grade power</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
