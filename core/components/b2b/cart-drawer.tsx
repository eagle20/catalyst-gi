'use client';

import { Minus, Plus, ShoppingBasket, Trash2, X } from 'lucide-react';
import { useB2BCart } from './cart-context';

export function B2BCartDrawer() {
  const { isOpen, closeCart, cart, cartCount, loading, updateItem, removeItem, checkoutUrl } =
    useB2BCart();

  if (!isOpen) return null;

  const handleCheckout = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-[hsl(var(--background))] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[hsl(var(--contrast-200))] px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBasket size={20} strokeWidth={1.5} className="text-[hsl(var(--foreground))]" />
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">B2B Cart</h2>
            {cartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-xs text-[hsl(var(--background))]">
                {cartCount}
              </span>
            )}
          </div>
          <button
            aria-label="Close cart"
            className="rounded p-1 text-[hsl(var(--contrast-500))] hover:bg-[hsl(var(--contrast-100))] hover:text-[hsl(var(--foreground))] transition-colors"
            onClick={closeCart}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex h-full items-center justify-center text-[hsl(var(--contrast-400))] text-sm">
              Loading…
            </div>
          )}

          {!loading && (!cart || cart.items.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-[hsl(var(--contrast-400))]">
              <ShoppingBasket size={48} strokeWidth={1} />
              <p className="text-sm">Your B2B cart is empty.</p>
            </div>
          )}

          {!loading && cart && cart.items.length > 0 && (
            <ul className="divide-y divide-[hsl(var(--contrast-200))]">
              {cart.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-snug text-[hsl(var(--foreground))]">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-[hsl(var(--contrast-500))]">SKU: {item.sku}</p>
                    </div>
                    <button
                      aria-label={`Remove ${item.productName}`}
                      className="mt-0.5 rounded p-1 text-[hsl(var(--contrast-400))] hover:text-red-500 hover:bg-[hsl(var(--contrast-100))] transition-colors"
                      disabled={loading}
                      onClick={() => void removeItem(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity stepper */}
                    <div className="flex items-center rounded border border-[hsl(var(--contrast-200))]">
                      <button
                        aria-label="Decrease quantity"
                        className="px-2 py-1.5 text-[hsl(var(--contrast-600))] hover:bg-[hsl(var(--contrast-100))] disabled:opacity-40 transition-colors"
                        disabled={loading || item.quantity <= 1}
                        onClick={() => void updateItem(item.id, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-[2.5rem] border-x border-[hsl(var(--contrast-200))] text-center text-sm py-1.5 text-[hsl(var(--foreground))]">
                        {item.quantity}
                      </span>
                      <button
                        aria-label="Increase quantity"
                        className="px-2 py-1.5 text-[hsl(var(--contrast-600))] hover:bg-[hsl(var(--contrast-100))] disabled:opacity-40 transition-colors"
                        disabled={loading}
                        onClick={() => void updateItem(item.id, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        ${item.totalPrice.toFixed(2)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-[hsl(var(--contrast-400))]">
                          ${item.unitPrice.toFixed(2)} ea
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-[hsl(var(--contrast-200))] px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--contrast-500))]">Subtotal</span>
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">${cart.subtotal.toFixed(2)}</span>
            </div>
            <button
              className="w-full rounded bg-[hsl(var(--foreground))] px-4 py-3 text-sm font-semibold text-[hsl(var(--background))] hover:bg-[hsl(var(--contrast-600))] disabled:opacity-50 transition-colors"
              disabled={loading || !checkoutUrl}
              onClick={handleCheckout}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
