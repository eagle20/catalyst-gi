'use client';

import { useState, useEffect } from 'react';
import { getB2BPricing, addToB2BCart, type B2BPricingResult } from '~/lib/b2b/api';

interface Props {
  sku: string;
  productName: string;
  bcProductId: number;
  /** BC catalog price — used as fallback when no portal contract price is set */
  bcPrice?: number | null;
}

export function B2BProductWidget({ sku, productName, bcProductId, bcPrice }: Props) {
  const [pricing, setPricing] = useState<B2BPricingResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getB2BPricing(sku)
      .then(setPricing)
      .catch(() => setPricing({ found: false, price: null }))
      .finally(() => setLoading(false));
  }, [sku]);

  async function handleAddToCart() {
    setAdding(true);
    setMessage(null);
    try {
      await addToB2BCart(sku, quantity, bcProductId, productName);
      setMessage({
        type: 'success',
        text: `${quantity} × ${productName} added to your B2B cart.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to add to cart. Please try again.',
      });
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-contrast-100" />;
  }

  const contractPrice = pricing?.price ?? null;
  const unitPrice = contractPrice ?? bcPrice ?? null;
  const isContractPrice = contractPrice != null;

  return (
    <div className="rounded-xl border border-contrast-200 bg-white p-6 shadow-sm">
      {/* Header badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-[#011F4B] px-3 py-1 text-xs font-semibold text-white">
          B2B Account Pricing
        </span>
      </div>

      {/* Price display */}
      {unitPrice != null ? (
        <p className="mb-5 text-3xl font-bold text-[#011F4B]">
          ${unitPrice.toFixed(2)}
          <span className="ml-2 text-sm font-normal text-contrast-400">
            {isContractPrice ? '/ unit — your contract price' : '/ unit — standard price'}
          </span>
        </p>
      ) : (
        <p className="mb-5 text-sm text-contrast-500">
          Contact your account manager for pricing on this item.
        </p>
      )}

      {/* Quantity picker + running total */}
      <div className="mb-5 flex items-center gap-3">
        <label className="shrink-0 text-sm font-medium" htmlFor="b2b-qty">
          Qty
        </label>
        <div className="flex items-center overflow-hidden rounded-lg border border-contrast-200">
          <button
            aria-label="Decrease quantity"
            className="px-3 py-2 text-lg leading-none hover:bg-contrast-100 disabled:opacity-40"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            type="button"
          >
            −
          </button>
          <input
            className="w-14 border-x border-contrast-200 py-2 text-center text-sm"
            id="b2b-qty"
            min={1}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            type="number"
            value={quantity}
          />
          <button
            aria-label="Increase quantity"
            className="px-3 py-2 text-lg leading-none hover:bg-contrast-100"
            onClick={() => setQuantity((q) => q + 1)}
            type="button"
          >
            +
          </button>
        </div>
        {unitPrice != null && (
          <span className="text-sm text-contrast-500">
            Total: <strong className="text-foreground">${(unitPrice * quantity).toFixed(2)}</strong>
          </span>
        )}
      </div>

      {/* Add to B2B cart */}
      <button
        className="w-full rounded-lg bg-[#011F4B] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#022a68] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={adding}
        onClick={handleAddToCart}
        type="button"
      >
        {adding ? 'Adding…' : 'Add to B2B Cart'}
      </button>

      {/* Feedback message */}
      {message && (
        <p
          className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
        >
          {message.text}
        </p>
      )}

      {/* Footer link to portal */}
      <p className="mt-4 text-xs text-contrast-400">
        PO-based checkout and order history are available in your{' '}
        <a
          className="underline hover:text-foreground"
          href={process.env.NEXT_PUBLIC_B2B_PORTAL_URL ?? 'https://portal.gitool.com'}
          rel="noopener noreferrer"
          target="_blank"
        >
          B2B portal
        </a>
        .
      </p>
    </div>
  );
}
