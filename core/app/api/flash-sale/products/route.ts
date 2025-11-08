import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { NextResponse } from 'next/server';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { ProductCardFragment } from '~/components/product-card/fragment';

const GetFlashSaleProducts = graphql(
  `
    query GetFlashSaleProducts($first: Int) {
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

export const GET = async () => {
  const customerAccessToken = await getSessionCustomerAccessToken();

  const { data } = await client.fetch({
    document: GetFlashSaleProducts,
    variables: { first: 12 },
    customerAccessToken,
  });

  const products = removeEdgesAndNodes(data.site.products);

  // Filter to only products with sale prices
  const saleProducts = products.filter((product) => {
    const prices = product.prices;
    if (!prices) return false;

    const basePrice = prices.basePrice?.value;
    const salePrice = prices.salePrice?.value ?? prices.price.value;

    return basePrice && salePrice && salePrice < basePrice;
  });

  return NextResponse.json(saleProducts);
};

export const runtime = 'edge';
