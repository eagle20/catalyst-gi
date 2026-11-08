/**
 * Client-side helpers for the B2B overlay API.
 * All calls go through the local /api/b2b proxy which attaches auth headers
 * before forwarding to the portal.  These functions are safe to call from
 * 'use client' components.
 */

export interface B2BPricingResult {
  sku: string;
  /** null means no contract price set for this company yet */
  price: number | null;
}

export interface B2BCartItem {
  id: string;
  sku: string;
  bcProductId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productUrl?: string | null;
  notes?: string | null;
}

export interface B2BCart {
  id: string;
  companyId: string;
  subtotal: number;
  total: number;
  items: B2BCartItem[];
}

/**
 * Thrown when the portal doesn't recognise the logged-in customer (401 from the portal): they're in
 * a B2B customer group in BigCommerce but have no portal user linked to a company, or the
 * storefront and portal shared secrets don't match.
 */
export const NO_PORTAL_ACCESS_MESSAGE =
  "Your B2B portal access isn't set up yet. Please contact your sales rep.";

export class B2BAccessError extends Error {
  constructor() {
    super(NO_PORTAL_ACCESS_MESSAGE);
    this.name = 'B2BAccessError';
  }
}

/** Code the /api/b2b proxy sends with its own 401 when the storefront session has ended. */
export const SIGNED_OUT_CODE = 'SIGNED_OUT';

/**
 * Throws for a failed proxy response. A 401 from the proxy itself (session ended) becomes an error
 * asking the customer to sign in again; a 401 from the portal becomes B2BAccessError.
 */
async function ensureOk(res: Response, action: string): Promise<void> {
  if (res.ok) return;

  const body: unknown = await res.json().catch(() => ({}));
  const { error, code } = (body ?? {}) as { error?: string; code?: string };

  if (res.status === 401) {
    if (code === SIGNED_OUT_CODE) {
      throw new Error('Your session has ended. Please sign in again.');
    }

    throw new B2BAccessError();
  }

  throw new Error(error ?? `${action} failed: ${res.status}`);
}

export async function getB2BPricing(sku: string): Promise<B2BPricingResult> {
  const res = await fetch(`/api/b2b/pricing?sku=${encodeURIComponent(sku)}`);
  await ensureOk(res, 'B2B pricing fetch');
  return res.json() as Promise<B2BPricingResult>;
}

export async function getB2BCart(): Promise<B2BCart> {
  const res = await fetch('/api/b2b/cart');
  await ensureOk(res, 'B2B cart fetch');
  const body = await res.json();
  return body.data as B2BCart;
}

export async function updateB2BCartItem(cartItemId: string, quantity: number): Promise<void> {
  const res = await fetch('/api/b2b/cart/items', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItemId, quantity }),
  });
  await ensureOk(res, 'B2B cart update');
}

export async function removeFromB2BCart(cartItemId: string): Promise<void> {
  const res = await fetch(`/api/b2b/cart/items?cartItemId=${encodeURIComponent(cartItemId)}`, {
    method: 'DELETE',
  });
  await ensureOk(res, 'B2B cart remove');
}

export async function addToB2BCart(
  sku: string,
  quantity: number,
  bcProductId: number,
  productName: string,
  unitPrice?: number,
  notes?: string,
  productUrl?: string,
): Promise<B2BCartItem> {
  const res = await fetch('/api/b2b/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, quantity, bcProductId, productName, unitPrice, notes, productUrl }),
  });
  await ensureOk(res, 'Add to B2B cart');
  const body = await res.json();
  return body.data as B2BCartItem;
}
