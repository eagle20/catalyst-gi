'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    paypal?: {
      Messages?: (config: Record<string, unknown>) => { render: (el: HTMLElement) => void };
    };
  }
}

interface PayPalMessageProps {
  amount: string;
  placement: 'product' | 'cart';
}

function parseAmount(formatted: string): string {
  // Strip everything except digits and decimal point
  return formatted.replace(/[^0-9.]/g, '');
}

export function PayPalMessage({ amount, placement }: PayPalMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (renderedRef.current || !containerRef.current) return;

    const render = () => {
      if (window.paypal?.Messages && containerRef.current) {
        renderedRef.current = true;
        window.paypal
          .Messages({
            amount: parseAmount(amount),
            placement,
            style: {
              layout: 'text',
              logo: { type: 'primary', position: 'left' },
            },
          })
          .render(containerRef.current);
      }
    };

    // Try immediately in case SDK is already loaded
    render();

    if (!renderedRef.current) {
      // Wait for SDK to load
      const interval = setInterval(() => {
        render();
        if (renderedRef.current) clearInterval(interval);
      }, 500);

      return () => clearInterval(interval);
    }
  }, [amount, placement]);

  return <div className="min-h-[20px]" ref={containerRef} />;
}
