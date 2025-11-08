import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { ProductCardFragment } from '~/components/product-card/fragment';
import { pricesTransformer } from '~/data-transformers/prices-transformer';
import { getPreferredCurrencyCode } from '~/lib/currency';
import { ProductCarousel } from '@/vibes/soul/sections/product-carousel';
import { FeaturedProductList } from '@/vibes/soul/sections/featured-product-list';

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
  title: 'Deals & Promotions',
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
  const products = await getPromotionsProducts();

  return (
    <div className="@container">
      {/* Featured Carousel Section */}
      <section className="my-8">
        <ProductCarousel
          products={products.slice(0, 12)}
          title="Today's Top Deals"
        />
      </section>

      {/* Featured Products Grid */}
      <section className="my-8">
        <FeaturedProductList
          products={products.slice(12, 20)}
          title="Limited Time Offers"
        />
      </section>

      {/* All Deals Grid */}
      <section className="my-8">
        <div className="mx-auto max-w-screen-2xl px-4">
          <h2 className="mb-6 text-2xl font-bold">All Deals</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product) => (
              <a
                key={product.id}
                href={product.href}
                className="group block overflow-hidden rounded border border-gray-200 bg-white transition hover:shadow-md"
              >
                {product.image && (
                  <div className="aspect-square overflow-hidden">
                    <img
                      alt={product.image.alt}
                      src={product.image.src}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-3">
                  {product.subtitle && (
                    <div className="mb-1 text-xs text-gray-600">{product.subtitle}</div>
                  )}
                  <h3 className="mb-2 line-clamp-2 text-sm leading-tight">{product.title}</h3>
                  {product.price && (
                    <div className="flex flex-col gap-0.5">
                      {product.price.salePrice && product.price.basePrice ? (
                        <>
                          <div className="font-bold text-red-600">{product.price.salePrice}</div>
                          <div className="text-xs text-gray-500 line-through">{product.price.basePrice}</div>
                        </>
                      ) : (
                        <div className="font-bold">{product.price.basePrice || product.price.salePrice}</div>
                      )}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
