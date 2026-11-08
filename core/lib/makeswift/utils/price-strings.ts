import { type Money, type Price, type TaxMode } from '@/vibes/soul/primitives/price-label';

const pick = (money: Money, mode: TaxMode | undefined) => (mode === 'INC' ? money.inc : money.ex);

/**
 * GI: flatten a Vibes `Price` into display strings for our custom Makeswift product cards
 * (`product-card-git`), which take a price and an optional sale price.
 */
export function priceToStrings(productPrice: Price | undefined): {
  price: string;
  salePrice?: string;
} {
  if (!productPrice) {
    return { price: '0' };
  }

  if (typeof productPrice === 'string') {
    return { price: productPrice };
  }

  switch (productPrice.type) {
    case 'plain':
      return { price: pick(productPrice.money, productPrice.mode) };

    case 'range':
      return {
        price: `${pick(productPrice.min, productPrice.mode)} - ${pick(productPrice.max, productPrice.mode)}`,
      };

    case 'sale':
      return {
        price: pick(productPrice.previous, productPrice.mode),
        salePrice: pick(productPrice.current, productPrice.mode),
      };
  }
}
