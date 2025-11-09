'use server';

import { unstable_expireTag } from 'next/cache';

import { auth, updateSession } from '~/auth';
import { addCartLineItem, AddCartLineItemsInput } from '~/client/mutations/add-cart-line-item';
import { createCart, CreateCartInput } from '~/client/mutations/create-cart';
import { getCart } from '~/client/queries/get-cart';
import { TAGS } from '~/client/tags';

import { MissingCartError } from './error';

export async function getCartId(): Promise<string | undefined> {
  const session = await auth();

  return session?.user?.cartId ?? undefined;
}

export async function setCartId(cartId: string): Promise<void> {
  await updateSession({ user: { cartId } });
}

export async function clearCartId(): Promise<void> {
  await updateSession({ user: { cartId: null } });
}

export async function addToOrCreateCart(
  data: CreateCartInput | AddCartLineItemsInput['data'],
): Promise<string> {
  const cartId = await getCartId();
  const cart = await getCart(cartId);

  if (cart) {
    const response = await addCartLineItem(cart.entityId, data);

    console.log('cart response: ', response.data.cart.addCartLineItems?.cart?.entityId);

    const updatedCartId = response.data.cart.addCartLineItems?.cart?.entityId;

    if (!updatedCartId) {
      throw new MissingCartError();
    }

    unstable_expireTag(TAGS.cart);

    return updatedCartId;
  }

  const createResponse = await createCart(data);

  console.log('Create response cart: ', createResponse);

  const newCartId = createResponse.data.cart.createCart?.cart?.entityId;

  if (!newCartId) {
    throw new MissingCartError();
  }

  await setCartId(newCartId);

  unstable_expireTag(TAGS.cart);

  return newCartId;
}
