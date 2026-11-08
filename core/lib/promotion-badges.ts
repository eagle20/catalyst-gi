import { client } from '~/client';

/**
 * GI: product ids that have an enabled gift (free tool) promotion, mapped to the promotion's
 * display name, for the badge on product cards. Returns an empty map if promotions can't be read.
 */
export async function getProductPromotionBadges(): Promise<Map<number, string>> {
  try {
    if (typeof client.fetchPromotions !== 'function') {
      return new Map();
    }

    const response = (await client.fetchPromotions()) as { data?: any[] } | undefined;

    if (!response?.data) {
      return new Map();
    }

    const productBadges = new Map<number, string>();

    response.data.forEach((promo: any) => {
      if (promo.status === 'ENABLED' && promo.rules && promo.display_name) {
        promo.rules.forEach((rule: any) => {
          if (rule.action?.gift_item) {
            const products = rule.condition?.cart?.items?.products;

            if (products && Array.isArray(products)) {
              products.forEach((productId: number) => {
                productBadges.set(productId, promo.display_name);
              });
            }
          }
        });
      }
    });

    return productBadges;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching product promotions for badges:', error);

    return new Map();
  }
}
