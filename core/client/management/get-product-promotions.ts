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
  condition: z
    .object({
      cart: z
        .object({
          items: z
            .object({
              products: z.array(z.number()).optional(),
            })
            .optional(),
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
  rules: z.array(PromotionRuleSchema),
});

const PromotionsResponseSchema = z.object({
  data: z.array(PromotionSchema),
});

export interface FreeGiftPromotion {
  id: number;
  name: string;
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
    const response = await client.fetchPromotions();
    const parsedResponse = PromotionsResponseSchema.safeParse(response);

    if (!parsedResponse.success) {
      console.error('Failed to parse promotions response:', parsedResponse.error);

      return null;
    }

    // Filter for active promotions with gift items that apply to this product
    const activeGiftPromotions = parsedResponse.data.data
      .filter((promo) => {
        // Must be enabled and have gift items
        if (promo.status !== 'ENABLED') return false;
        if (!promo.rules.some((rule) => rule.action?.gift_item)) return false;

        // Check if any rule applies to this product
        return promo.rules.some((rule) => {
          // If rule has condition with products, check if our productId is in the list
          const products = rule.condition?.cart?.items?.products;

          if (products && products.length > 0) {
            return products.includes(productId);
          }

          // If no condition specified, promotion might apply to all products
          // For safety, we'll only include if it has a gift_item action
          return rule.action?.gift_item !== undefined;
        });
      })
      .map((promo) => ({
        id: promo.id,
        name: promo.name,
        giftItems: promo.rules
          .filter((rule) => rule.action?.gift_item)
          .map((rule) => ({
            productId: rule.action!.gift_item!.product_id,
            variantId: rule.action!.gift_item!.variant_id,
            quantity: rule.action!.gift_item!.quantity,
          })),
      }));

    return activeGiftPromotions.length > 0 ? activeGiftPromotions : null;
  } catch (error) {
    console.error('Error fetching product promotions:', error);

    return null;
  }
};
