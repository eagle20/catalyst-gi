/**
 * Client-side helpers for the B2B overlay API.
 * All calls go through the local /api/b2b proxy which attaches auth headers
 * before forwarding to the portal.  These functions are safe to call from
 * 'use client' components.
 */

export interface B2BPricingResult {
  found: boolean;
  sku?: string;
  name?: string;
  /** null means the product exists but has no company-specific price set */
  price: number | null;
}

export interface B2BCartItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
}

export interface B2BCart {
  id: string;
  companyId: string;
  subtotal: number;
  total: number;
  items: B2BCartItem[];
}

export async function getB2BPricing(sku: string): Promise<B2BPricingResult> {
  const res = await fetch(`/api/b2b/pricing?sku=${encodeURIComponent(sku)}`);
  if (!res.ok) throw new Error(`B2B pricing fetch failed: ${res.status}`);
  return res.json() as Promise<B2BPricingResult>;
}

export async function getB2BCart(): Promise<B2BCart> {
  const res = await fetch('/api/b2b/cart');
  if (!res.ok) throw new Error(`B2B cart fetch failed: ${res.status}`);
  const body = await res.json();
  return body.data as B2BCart;
}

export async function addToB2BCart(
  sku: string,
  quantity: number,
  notes?: string,
): Promise<B2BCartItem> {
  const res = await fetch('/api/b2b/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, quantity, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Add to B2B cart failed: ${res.status}`);
  }
  const body = await res.json();
  return body.data as B2BCartItem;
}
