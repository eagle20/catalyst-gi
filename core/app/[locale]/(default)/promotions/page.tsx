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
    <div className="bg-white">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold">Deals</h1>
        </div>
      </div>

      {/* Simple Clean Product Grid */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => (
            <a
              key={product.id}
              href={product.href}
              className="group block rounded-lg border border-gray-200 bg-white p-3 hover:shadow-md"
            >
              {product.image && (
                <div className="mb-3">
                  <img
                    alt={product.image.alt}
                    src={product.image.src}
                    className="w-full"
                  />
                </div>
              )}
              <div className="mb-1 text-xs text-gray-600">{product.subtitle}</div>
              <h3 className="mb-2 line-clamp-2 text-sm">{product.title}</h3>
              {product.price && (
                <div className="font-bold text-red-600">
                  {product.price.salePrice || product.price.basePrice}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
