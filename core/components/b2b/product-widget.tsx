'use client';

import { useState, useEffect } from 'react';
import { FormStatus } from '@/vibes/soul/form/form-status';
import { NumberInput } from '@/vibes/soul/form/number-input';
import { Button } from '@/vibes/soul/primitives/button';
import { getB2BPricing, type B2BPricingResult } from '~/lib/b2b/api';
import { useB2BCart } from './cart-context';

interface Props {
  sku: string;
  productName: string;
  bcProductId: number;
  /** BC catalog price — used as fallback when no portal contract price is set */
  bcPrice?: number | null;
  /** Relative URL of this product page e.g. /products/my-product */
  productUrl?: string;
  /** SSO URL pointing to portal dashboard (for the footer link) */
  portalUrl?: string;
}

export function B2BProductWidget({ sku, productName, bcProductId, bcPrice, productUrl, portalUrl }: Props) {
  const { addItem, loading: cartLoading } = useB2BCart();
  const [pricing, setPricing] = useState<B2BPricingResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getB2BPricing(sku)
      .then(setPricing)
      .catch(() => setPricing({ sku, price: null }))
      .finally(() => setPricingLoading(false));
  }, [sku]);

  if (pricingLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-contrast-100" />;
  }

  const contractPrice = pricing?.price ?? null;
  const unitPrice = contractPrice ?? bcPrice ?? null;
  const isContractPrice = contractPrice != null;

  async function handleAddToCart() {
    setMessage(null);
    try {
      await addItem(sku, quantity, bcProductId, productName, unitPrice ?? undefined, productUrl);
      setMessage({
        type: 'success',
        text: `${quantity} × ${productName} added to your B2B cart.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to add to cart. Please try again.',
      });
    }
  }

  return (
    <div className="rounded-lg border border-[hsl(var(--contrast-200))] bg-[hsl(var(--background))] p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <span className="rounded-full bg-[hsl(var(--foreground))] px-3 py-1 text-xs font-semibold text-[hsl(var(--background))]">
          B2B Account Pricing
        </span>
      </div>

      {/* Price display */}
      {unitPrice != null ? (
        <div className="mb-6">
          <p className="font-heading text-3xl font-medium text-[hsl(var(--foreground))]">
            ${unitPrice.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--contrast-400))]">
            {isContractPrice ? 'Your contract price' : 'Standard price'} / unit
          </p>
        </div>
      ) : (
        <p className="mb-6 text-sm text-[hsl(var(--contrast-500))]">
          Contact your account manager for pricing on this item.
        </p>
      )}

      {/* Quantity + running total */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <NumberInput
          aria-label="Quantity"
          buttonClassName="w-full"
          decrementLabel="Decrease quantity"
          incrementLabel="Increase quantity"
          min={1}
          max={9999}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.currentTarget.value) || 1))}
        />
        {unitPrice != null && (
          <p className="text-sm text-[hsl(var(--contrast-500))]">
            Total:{' '}
            <strong className="font-semibold text-[hsl(var(--foreground))]">
              ${(unitPrice * quantity).toFixed(2)}
            </strong>
          </p>
        )}
      </div>

      {/* CTA */}
      <Button
        className="w-full"
        disabled={cartLoading}
        onClick={() => void handleAddToCart()}
        shape="rounded"
        size="medium"
        type="button"
        variant="secondary"
      >
        {cartLoading ? 'Adding…' : 'Add to B2B Cart'}
      </Button>

      {/* Feedback message */}
      {message && (
        <div className="mt-3">
          <FormStatus type={message.type}>{message.text}</FormStatus>
        </div>
      )}

      {/* Portal link */}
      <p className="mt-5 text-xs text-[hsl(var(--contrast-400))]">
        PO-based checkout and order history are available in your{' '}
        <a
          className="underline underline-offset-2 hover:text-[hsl(var(--foreground))] transition-colors"
          href={portalUrl ?? 'https://portal.gitool.com'}
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
