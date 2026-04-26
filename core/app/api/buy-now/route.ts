import { NextRequest, NextResponse } from 'next/server';

import { client } from '~/client';
import { graphql } from '~/client/graphql';

const CreateCartMutation = graphql(`
  mutation BuyNowCreateCart($input: CreateCartInput!) {
    cart {
      createCart(input: $input) {
        cart {
          entityId
        }
      }
    }
  }
`);

const CheckoutRedirectMutation = graphql(`
  mutation BuyNowCheckoutRedirect($cartId: String!) {
    cart {
      createCartRedirectUrls(input: { cartEntityId: $cartId }) {
        redirectUrls {
          redirectedCheckoutUrl
        }
      }
    }
  }
`);

async function resolveEntityId(productId: string): Promise<number | null> {
  const numeric = Number(productId);

  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }

  // SKU-based lookup via BigCommerce Management API
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !accessToken) return null;

  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?sku=${encodeURIComponent(productId)}&include_fields=id`;

  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': accessToken,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const json = await res.json() as { data?: Array<{ id: number }> };

  return json.data?.[0]?.id ?? null;
}

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = request.nextUrl;
  const rawProductId = searchParams.get('product_id');
  const quantity = Math.max(1, Number(searchParams.get('quantity') ?? '1'));

  if (!rawProductId) {
    return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });
  }

  const productEntityId = await resolveEntityId(rawProductId);

  if (!productEntityId) {
    return NextResponse.json({ error: `Product not found: ${rawProductId}` }, { status: 404 });
  }

  try {
    const createResult = await client.fetch({
      document: CreateCartMutation,
      variables: {
        input: {
          lineItems: [{ productEntityId, quantity }],
        },
      },
      fetchOptions: { cache: 'no-store' },
    });

    const cartId = createResult.data.cart.createCart?.cart?.entityId;

    if (!cartId) {
      return NextResponse.json({ error: 'Failed to create cart' }, { status: 500 });
    }

    const redirectResult = await client.fetch({
      document: CheckoutRedirectMutation,
      variables: { cartId },
      fetchOptions: { cache: 'no-store' },
    });

    const checkoutUrl =
      redirectResult.data.cart.createCartRedirectUrls.redirectUrls?.redirectedCheckoutUrl;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to get checkout URL' }, { status: 500 });
    }

    return NextResponse.redirect(checkoutUrl, { status: 302 });
  } catch (error) {
    console.error('[buy-now]', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
