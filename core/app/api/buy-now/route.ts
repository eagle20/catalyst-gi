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

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = request.nextUrl;
  const rawProductId = searchParams.get('product_id');
  const quantity = Math.max(1, Number(searchParams.get('quantity') ?? '1'));

  const productEntityId = Number(rawProductId);

  if (!rawProductId || !Number.isInteger(productEntityId) || productEntityId <= 0) {
    return NextResponse.json({ error: 'Missing or invalid product_id' }, { status: 400 });
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
