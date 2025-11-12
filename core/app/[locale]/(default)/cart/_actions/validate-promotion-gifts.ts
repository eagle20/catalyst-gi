'use server';

import { getCart } from '~/client/queries/get-cart';
import { getProductPromotions } from '~/client/management/get-product-promotions';
import { getCartId } from '~/lib/cart';
import { removeItem } from './remove-item';

interface CartItem {
  entityId: string;
  productEntityId: number;
  variantEntityId: number | null;
  quantity: number;
  extendedSalePrice: {
    value: number;
  };
}

/**
 * Validates and adjusts free gift items in the cart based on qualifying products
 * Returns the list of gift items that were removed
 */
export async function validatePromotionGifts(): Promise<{
  removedGifts: string[];
  message?: string;
}> {
  const cartId = await getCartId();

  if (!cartId) {
    return { removedGifts: [] };
  }

  const cart = await getCart(cartId);

  if (!cart) {
    return { removedGifts: [] };
  }

  const allItems = [...cart.lineItems.physicalItems, ...cart.lineItems.digitalItems];

  console.log('🔍 [validate-gifts] Validating cart items:', {
    totalItems: allItems.length,
    items: allItems.map(item => ({
      id: item.entityId,
      productId: item.productEntityId,
      quantity: item.quantity,
      price: item.extendedSalePrice.value
    }))
  });

  // Identify potential free gifts (items with $0 price)
  const potentialGifts = allItems.filter(item => item.extendedSalePrice.value === 0);

  if (potentialGifts.length === 0) {
    console.log('✅ [validate-gifts] No free gifts in cart');
    return { removedGifts: [] };
  }

  console.log('🎁 [validate-gifts] Found potential free gifts:', potentialGifts.length);

  // Build a map of qualifying products and their quantities
  const qualifyingProducts = new Map<number, number>();

  allItems
    .filter(item => item.extendedSalePrice.value > 0) // Only paid items
    .forEach(item => {
      const currentQty = qualifyingProducts.get(item.productEntityId) || 0;
      qualifyingProducts.set(item.productEntityId, currentQty + item.quantity);
    });

  console.log('🔍 [validate-gifts] Qualifying products:', Array.from(qualifyingProducts.entries()));

  // Fetch promotions for all qualifying products
  const allPromotions = await Promise.all(
    Array.from(qualifyingProducts.keys()).map(productId => getProductPromotions(productId))
  );

  // Flatten and deduplicate promotions
  const activePromotions = allPromotions
    .filter(p => p !== null)
    .flat()
    .reduce((acc, promo) => {
      if (!acc.find(p => p.id === promo.id)) {
        acc.push(promo);
      }
      return acc;
    }, [] as NonNullable<Awaited<ReturnType<typeof getProductPromotions>>>[number][]);

  console.log('🎁 [validate-gifts] Active promotions:', activePromotions.length);

  if (activePromotions.length === 0) {
    // No active promotions, but we have free items - remove them all
    console.log('⚠️ [validate-gifts] No active promotions, removing all free gifts');
    const removedGifts: string[] = [];

    for (const gift of potentialGifts) {
      try {
        await removeItem({ lineItemEntityId: gift.entityId, skipValidation: true });
        removedGifts.push(gift.entityId);
        console.log('✅ [validate-gifts] Removed gift:', gift.entityId);
      } catch (error) {
        console.error('❌ [validate-gifts] Failed to remove gift:', gift.entityId, error);
      }
    }

    return {
      removedGifts,
      message: removedGifts.length > 0
        ? 'Free gifts removed - qualifying products no longer in cart'
        : undefined
    };
  }

  // Calculate allowed gift quantities for each promotion
  const allowedGifts = new Map<string, number>(); // key: productId-variantId, value: max quantity

  // Group promotions by the products they were fetched for
  const promotionsByQualifyingProduct = new Map<number, typeof activePromotions>();

  for (const [productId] of qualifyingProducts) {
    const productPromos = await getProductPromotions(productId);
    if (productPromos && productPromos.length > 0) {
      promotionsByQualifyingProduct.set(productId, productPromos);
    }
  }

  console.log('🎁 [validate-gifts] Promotions by qualifying product:',
    Array.from(promotionsByQualifyingProduct.entries()).map(([pid, promos]) => ({
      productId: pid,
      promoCount: promos.length
    }))
  );

  for (const promo of activePromotions) {
    // Find which qualifying products in the cart trigger this promotion
    const qualifyingProductIds = Array.from(promotionsByQualifyingProduct.entries())
      .filter(([, promos]) => promos.some(p => p.id === promo.id))
      .map(([productId]) => productId);

    const qualifyingQty = qualifyingProductIds.reduce((total, productId) => {
      return total + (qualifyingProducts.get(productId) || 0);
    }, 0);

    console.log('🎁 [validate-gifts] Promo', promo.id, 'qualifying products:', qualifyingProductIds, 'total qty:', qualifyingQty);

    if (qualifyingQty === 0) {
      // No qualifying products for this promotion in cart
      continue;
    }

    // Calculate how many gifts allowed
    let giftsAllowed = 0;
    if (promo.applyOnce) {
      giftsAllowed = qualifyingQty >= promo.minimumQuantity ? 1 : 0;
    } else {
      giftsAllowed = Math.floor(qualifyingQty / promo.minimumQuantity);
    }

    console.log('🎁 [validate-gifts] Promo', promo.id, 'gifts allowed:', giftsAllowed);

    // Track allowed gifts for each gift item in this promotion
    for (const giftItem of promo.giftItems) {
      const key = `${giftItem.productId}-${giftItem.variantId || 'none'}`;
      const current = allowedGifts.get(key) || 0;
      allowedGifts.set(key, current + giftsAllowed);
    }
  }

  console.log('🎁 [validate-gifts] Allowed gifts:', Array.from(allowedGifts.entries()));

  // Check each potential gift against allowed quantities
  const removedGifts: string[] = [];

  for (const gift of potentialGifts) {
    const giftKey = `${gift.productEntityId}-${gift.variantEntityId || 'none'}`;
    const allowedQty = allowedGifts.get(giftKey) || 0;

    console.log('🔍 [validate-gifts] Checking gift:', {
      key: giftKey,
      currentQty: gift.quantity,
      allowedQty
    });

    if (allowedQty === 0) {
      // This gift is no longer allowed, remove it entirely
      try {
        await removeItem({ lineItemEntityId: gift.entityId, skipValidation: true });
        removedGifts.push(gift.entityId);
        console.log('✅ [validate-gifts] Removed disallowed gift:', gift.entityId);
      } catch (error) {
        console.error('❌ [validate-gifts] Failed to remove gift:', gift.entityId, error);
      }
    } else if (gift.quantity > allowedQty) {
      // Too many of this gift, reduce quantity
      // Note: We can't easily update quantity here without the full cart update mutation
      // For now, we'll remove the excess entirely and log a warning
      try {
        await removeItem({ lineItemEntityId: gift.entityId, skipValidation: true });
        removedGifts.push(gift.entityId);
        console.log('⚠️ [validate-gifts] Removed excess gift (quantity mismatch):', gift.entityId);
      } catch (error) {
        console.error('❌ [validate-gifts] Failed to remove excess gift:', gift.entityId, error);
      }
    }
  }

  return {
    removedGifts,
    message: removedGifts.length > 0
      ? `${removedGifts.length} free gift${removedGifts.length > 1 ? 's' : ''} removed due to cart changes`
      : undefined
  };
}
