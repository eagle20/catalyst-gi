/**
 * Calculate discount percentage between original and sale price
 */
export function calculateDiscountPercentage(originalPrice: number, salePrice: number): number {
  if (originalPrice <= 0 || salePrice >= originalPrice) {
    return 0;
  }

  const discount = ((originalPrice - salePrice) / originalPrice) * 100;
  return Math.round(discount);
}

/**
 * Format discount as a badge label (e.g., "20% OFF")
 */
export function formatDiscountBadge(discountPercentage: number): string {
  if (discountPercentage <= 0) {
    return '';
  }

  return `${discountPercentage}% OFF`;
}

/**
 * Get discount info from pricing object
 */
export interface DiscountInfo {
  hasDiscount: boolean;
  percentage: number;
  badgeLabel: string;
}

export function getDiscountInfo(
  basePrice: number | null | undefined,
  salePrice: number | null | undefined,
): DiscountInfo {
  if (!basePrice || !salePrice || salePrice >= basePrice) {
    return {
      hasDiscount: false,
      percentage: 0,
      badgeLabel: '',
    };
  }

  const percentage = calculateDiscountPercentage(basePrice, salePrice);

  return {
    hasDiscount: percentage > 0,
    percentage,
    badgeLabel: formatDiscountBadge(percentage),
  };
}
