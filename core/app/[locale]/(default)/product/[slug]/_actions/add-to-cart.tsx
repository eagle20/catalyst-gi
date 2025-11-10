'use server';

import { BigCommerceGQLError } from '@bigcommerce/catalyst-client';
import { SubmissionResult } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

import { Field, schema } from '@/vibes/soul/sections/product-detail/schema';
import { graphql } from '~/client/graphql';
import { Link } from '~/components/link';
import { addToOrCreateCart, getCartId } from '~/lib/cart';
import { MissingCartError } from '~/lib/cart/error';
import { getCart } from '~/client/queries/get-cart';
import { applyCouponCode } from '../../../cart/_actions/apply-coupon-code';
import { removeItem } from '../../../cart/_actions/remove-item';

type CartSelectedOptionsInput = ReturnType<typeof graphql.scalar<'CartSelectedOptionsInput'>>;

interface State {
  fields: Field[];
  lastResult: SubmissionResult | null;
  successMessage?: ReactNode;
}

export const addToCart = async (
  prevState: State,
  payload: FormData,
): Promise<{
  fields: Field[];
  lastResult: SubmissionResult | null;
  successMessage?: ReactNode;
}> => {
  const t = await getTranslations('Product.ProductDetails');

  const submission = parseWithZod(payload, { schema: schema(prevState.fields) });

  if (submission.status !== 'success') {
    return { lastResult: submission.reply(), fields: prevState.fields };
  }

  const productEntityId = Number(submission.value.id);
  const quantity = Number(submission.value.quantity);
  const freeToolProductId = submission.value.freeToolProductId
    ? Number(submission.value.freeToolProductId)
    : undefined;
  const freeToolVariantId = submission.value.freeToolVariantId
    ? Number(submission.value.freeToolVariantId)
    : undefined;
  const promoCode = submission.value.promoCode;

  const selectedOptions = prevState.fields.reduce<CartSelectedOptionsInput>((accum, field) => {
    const optionValueEntityId = submission.value[field.name];

    let multipleChoicesOptionInput;
    let checkboxOptionInput;
    let numberFieldOptionInput;
    let textFieldOptionInput;
    let multiLineTextFieldOptionInput;
    let dateFieldOptionInput;

    // Skip empty strings since option is empty
    if (!optionValueEntityId) return accum;

    switch (field.type) {
      case 'select':
      case 'radio-group':
      case 'swatch-radio-group':
      case 'card-radio-group':
      case 'button-radio-group':
        multipleChoicesOptionInput = {
          optionEntityId: Number(field.name),
          optionValueEntityId: Number(optionValueEntityId),
        };

        if (accum.multipleChoices) {
          return {
            ...accum,
            multipleChoices: [...accum.multipleChoices, multipleChoicesOptionInput],
          };
        }

        return { ...accum, multipleChoices: [multipleChoicesOptionInput] };

      case 'checkbox':
        checkboxOptionInput = {
          optionEntityId: Number(field.name),
          optionValueEntityId:
            optionValueEntityId === 'true'
              ? // @ts-expect-error Types from custom fields are not yet available, pending fix
                Number(field.checkedValue)
              : // @ts-expect-error Types from custom fields are not yet available, pending fix
                Number(field.uncheckedValue),
        };

        if (accum.checkboxes) {
          return { ...accum, checkboxes: [...accum.checkboxes, checkboxOptionInput] };
        }

        return { ...accum, checkboxes: [checkboxOptionInput] };

      case 'number':
        numberFieldOptionInput = {
          optionEntityId: Number(field.name),
          number: Number(optionValueEntityId),
        };

        if (accum.numberFields) {
          return { ...accum, numberFields: [...accum.numberFields, numberFieldOptionInput] };
        }

        return { ...accum, numberFields: [numberFieldOptionInput] };

      case 'text':
        textFieldOptionInput = {
          optionEntityId: Number(field.name),
          text: String(optionValueEntityId),
        };

        if (accum.textFields) {
          return {
            ...accum,
            textFields: [...accum.textFields, textFieldOptionInput],
          };
        }

        return { ...accum, textFields: [textFieldOptionInput] };

      case 'textarea':
        multiLineTextFieldOptionInput = {
          optionEntityId: Number(field.name),
          text: String(optionValueEntityId),
        };

        if (accum.multiLineTextFields) {
          return {
            ...accum,
            multiLineTextFields: [...accum.multiLineTextFields, multiLineTextFieldOptionInput],
          };
        }

        return { ...accum, multiLineTextFields: [multiLineTextFieldOptionInput] };

      case 'date':
        dateFieldOptionInput = {
          optionEntityId: Number(field.name),
          date: new Date(String(optionValueEntityId)).toISOString(),
        };

        if (accum.dateFields) {
          return {
            ...accum,
            dateFields: [...accum.dateFields, dateFieldOptionInput],
          };
        }

        return { ...accum, dateFields: [dateFieldOptionInput] };

      default:
        return { ...accum };
    }
  }, {});

  try {
    console.log('🔵 Adding to cart - Main product:', productEntityId, 'Free tool:', freeToolProductId, 'Promo code:', promoCode);

    // Add only the main product first - this returns the cart ID
    const cartId = await addToOrCreateCart({
      lineItems: [
        {
          productEntityId,
          selectedOptions,
          quantity,
        },
      ],
    });

    console.log('✅ Main product added, cart ID:', cartId);

    // Apply promo code if present (this will auto-add ALL gift items)
    if (promoCode && cartId) {
      try {
        console.log('🎟️ Applying promo code to cart:', promoCode, 'Cart ID:', cartId);
        await applyCouponCode({
          checkoutEntityId: cartId,
          couponCode: promoCode,
        });
        console.log('✅ Promo code applied successfully');

        // After applying coupon, BigCommerce auto-adds ALL gift items
        // We need to remove the ones the customer didn't select
        if (freeToolProductId) {
          console.log('🔵 Checking for unwanted gift items to remove...');
          const cart = await getCart(cartId);
          const allItems = [
            ...(cart?.lineItems.physicalItems || []),
            ...(cart?.lineItems.digitalItems || []),
          ];

          console.log('🔵 Cart contents after applying coupon:', allItems.map(item => ({
            entityId: item.entityId,
            productId: item.productEntityId,
            variantId: item.variantEntityId,
            name: item.name,
            quantity: item.quantity
          })));

          // Find items to remove: gift items that don't match the selected gift
          const itemsToRemove = allItems.filter((item) => {
            // Skip if this is the main product
            if (item.productEntityId === productEntityId) return false;

            // This is a gift item - check if it matches the selected gift
            const isSelectedGift = item.productEntityId === freeToolProductId &&
              (!freeToolVariantId || item.variantEntityId === freeToolVariantId);

            // Remove if it's NOT the selected gift
            return !isSelectedGift;
          });

          console.log('🔵 Items to remove:', itemsToRemove.map(item => ({
            entityId: item.entityId,
            productId: item.productEntityId,
            name: item.name
          })));

          // Remove unwanted gift items
          for (const item of itemsToRemove) {
            try {
              console.log(`🗑️ Removing unwanted gift: ${item.name} (entityId: ${item.entityId})`);
              await removeItem({ lineItemEntityId: item.entityId });
              console.log(`✅ Removed unwanted gift: ${item.name}`);
            } catch (error) {
              console.error(`❌ Failed to remove item ${item.entityId}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to apply promo code:', error);
        // Don't fail the entire operation if coupon application fails
        // The items are already in cart, coupon can be applied manually
      }
    }

    return {
      lastResult: submission.reply(),
      fields: prevState.fields,
      successMessage: freeToolProductId
        ? 'Battery and free tool added to cart!'
        : t.rich('successMessage', {
            cartItems: quantity,
            cartLink: (chunks) => (
              <Link className="underline" href="/cart" prefetch="viewport" prefetchKind="full">
                {chunks}
              </Link>
            ),
          }),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    if (error instanceof BigCommerceGQLError) {
      return {
        lastResult: submission.reply({
          formErrors: error.errors.map(({ message }) => {
            if (message.includes('Not enough stock:')) {
              // This removes the item id from the message. It's very brittle, but it's the only
              // solution to do it until our API returns a better error message.
              return message.replace('Not enough stock: ', '').replace(/\(\w.+\)\s{1}/, '');
            }

            return message;
          }),
        }),
        fields: prevState.fields,
      };
    }

    if (error instanceof MissingCartError) {
      return {
        lastResult: submission.reply({ formErrors: [t('missingCart')] }),
        fields: prevState.fields,
      };
    }

    if (error instanceof Error) {
      return {
        lastResult: submission.reply({ formErrors: [error.message] }),
        fields: prevState.fields,
      };
    }

    return {
      lastResult: submission.reply({ formErrors: [t('unknownError')] }),
      fields: prevState.fields,
    };
  }
};
