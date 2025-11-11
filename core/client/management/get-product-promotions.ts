import { z } from 'zod';

import { client } from '..';

const GiftItemSchema = z.object({
  product_id: z.number().optional(),
  variant_id: z.number().optional(),
  quantity: z.number(),
});

const PromotionRuleSchema = z.object({
  action: z
    .object({
      gift_item: GiftItemSchema.optional(),
    })
    .optional(),
  apply_once: z.boolean().optional(),
  condition: z
    .object({
      cart: z
        .object({
          items: z
            .object({
              products: z.array(z.number()).optional(),
            })
            .optional(),
          minimum_quantity: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const PromotionSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['ENABLED', 'DISABLED', 'EXPIRED']),
  redemption_type: z.string().optional(),
  coupon_type: z.string().optional(),
  display_name: z.string().optional(),
  rules: z.array(PromotionRuleSchema),
});

const PromotionsResponseSchema = z.object({
  data: z.array(PromotionSchema),
});

const CouponCodeSchema = z.object({
  id: z.number(),
  code: z.string(),
  current_uses: z.number(),
  max_uses: z.number(),
});

const CouponCodesResponseSchema = z.object({
  data: z.array(CouponCodeSchema),
});

// Helper function to fetch coupon codes for a promotion
async function fetchCouponCode(promotionId: number): Promise<string | undefined> {
  try {
    const response = await client.fetchPromotionCodes(promotionId);
    const parsedResponse = CouponCodesResponseSchema.safeParse(response);

    if (parsedResponse.success && parsedResponse.data.data.length > 0) {
      // Return the first coupon code
      return parsedResponse.data.data[0].code;
    }

    return undefined;
  } catch (error) {
    console.error(`❌ [get-product-promotions] Error fetching coupon codes for promotion ${promotionId}:`, error);
    return undefined;
  }
}

export interface FreeGiftPromotion {
  id: number;
  name: string;
  displayName?: string;
  promoCode?: string;
  minimumQuantity: number;
  applyOnce: boolean;
  giftItems: Array<{
    productId?: number;
    variantId?: number;
    quantity: number;
  }>;
}

export const getProductPromotions = async (
  productId: number,
): Promise<FreeGiftPromotion[] | null> => {
  try {
    console.log('🔍 [get-product-promotions] Fetching promotions for product ID:', productId);

    // Check if fetchPromotions method exists
    if (typeof client.fetchPromotions !== 'function') {
      console.error('❌ [get-product-promotions] client.fetchPromotions is not available');

      return null;
    }

    const response = await client.fetchPromotions();
    console.log('🔍 [get-product-promotions] Raw response:', {
      hasData: !!response?.data,
      promotionCount: response?.data?.length || 0
    });

    const parsedResponse = PromotionsResponseSchema.safeParse(response);

    if (!parsedResponse.success) {
      console.error('❌ [get-product-promotions] Failed to parse promotions response:', parsedResponse.error);

      return null;
    }

    console.log('🔍 [get-product-promotions] Total promotions from API:', parsedResponse.data.data.length);

    // Filter for active promotions with gift items that apply to this product
    const filteredPromotions = parsedResponse.data.data
      .filter((promo) => {
        console.log('🔍 [get-product-promotions] Checking promotion:', {
          id: promo.id,
          name: promo.name,
          status: promo.status,
          hasGiftItems: promo.rules.some((rule) => rule.action?.gift_item)
        });

        // Must be enabled and have gift items
        if (promo.status !== 'ENABLED') {
          console.log('  ⚠️ Skipped - not ENABLED');
          return false;
        }
        if (!promo.rules.some((rule) => rule.action?.gift_item)) {
          console.log('  ⚠️ Skipped - no gift items');
          return false;
        }

        // Check if any rule applies to this product
        const appliesToProduct = promo.rules.some((rule) => {
          // If rule has condition with products, check if our productId is in the list
          const products = rule.condition?.cart?.items?.products;

          if (products && products.length > 0) {
            const applies = products.includes(productId);
            console.log('  🔍 Rule products:', products, 'applies to', productId, '?', applies);
            return applies;
          }

          // If no condition specified, promotion might apply to all products
          // For safety, we'll only include if it has a gift_item action
          console.log('  🔍 No product condition, has gift_item?', rule.action?.gift_item !== undefined);
          return rule.action?.gift_item !== undefined;
        });

        console.log('  ✅ Applies to product?', appliesToProduct);
        return appliesToProduct;
      });

    // Fetch coupon codes for COUPON type promotions
    const activeGiftPromotions = await Promise.all(
      filteredPromotions.map(async (promo) => {
        // Get the first rule with gift item to extract condition details
        const giftRule = promo.rules.find((rule) => rule.action?.gift_item);

        // For COUPON redemption type, fetch the actual coupon code
        let promoCode = promo.display_name;
        if (promo.redemption_type === 'COUPON' && typeof client.fetchPromotionCodes === 'function') {
          console.log(`🔍 [get-product-promotions] Fetching coupon code for promotion ${promo.id}`);
          const fetchedCode = await fetchCouponCode(promo.id);
          if (fetchedCode) {
            promoCode = fetchedCode;
            console.log(`✅ [get-product-promotions] Got coupon code: ${fetchedCode}`);
          }
        }

        return {
          id: promo.id,
          name: promo.name,
          displayName: promo.display_name,
          promoCode,
          minimumQuantity: giftRule?.condition?.cart?.minimum_quantity || 1,
          applyOnce: giftRule?.apply_once ?? false,
          giftItems: promo.rules
            .filter((rule) => rule.action?.gift_item)
            .map((rule) => ({
              productId: rule.action!.gift_item!.product_id,
              variantId: rule.action!.gift_item!.variant_id,
              quantity: rule.action!.gift_item!.quantity,
            })),
        };
      })
    );

    console.log('🔍 [get-product-promotions] Returning promotions:', {
      count: activeGiftPromotions.length,
      promotions: activeGiftPromotions
    });

    return activeGiftPromotions.length > 0 ? activeGiftPromotions : null;
  } catch (error) {
    console.error('❌ [get-product-promotions] Error fetching product promotions:', error);

    return null;
  }
};
