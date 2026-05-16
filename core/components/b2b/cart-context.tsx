'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  addToB2BCart,
  getB2BCart,
  removeFromB2BCart,
  updateB2BCartItem,
  type B2BCart,
} from '~/lib/b2b/api';

interface B2BCartContextType {
  isB2B: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cart: B2BCart | null;
  cartCount: number;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addItem: (
    sku: string,
    quantity: number,
    bcProductId: number,
    productName: string,
    unitPrice?: number,
    productUrl?: string,
  ) => Promise<void>;
  updateItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  checkoutUrl: string;
}

const B2BCartContext = createContext<B2BCartContextType>({
  isB2B: false,
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  cart: null,
  cartCount: 0,
  loading: false,
  refreshCart: async () => {},
  addItem: async () => {},
  updateItem: async () => {},
  removeItem: async () => {},
  checkoutUrl: '',
});

export function B2BCartProvider({
  children,
  checkoutUrl,
}: {
  children: React.ReactNode;
  checkoutUrl: string;
}) {
  const [cart, setCart] = useState<B2BCart | null>(null);
  const [isB2B, setIsB2B] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  const refreshCart = useCallback(async () => {
    try {
      const data = await getB2BCart();
      setCart(data);
      setIsB2B(true);
    } catch {
      // Not a B2B user or not logged in — silently ignore
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void refreshCart();
  }, [refreshCart]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    async (
      sku: string,
      quantity: number,
      bcProductId: number,
      productName: string,
      unitPrice?: number,
      productUrl?: string,
    ) => {
      setLoading(true);
      try {
        await addToB2BCart(sku, quantity, bcProductId, productName, unitPrice, undefined, productUrl);
        await refreshCart();
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [refreshCart],
  );

  const updateItem = useCallback(
    async (cartItemId: string, quantity: number) => {
      setLoading(true);
      try {
        await updateB2BCartItem(cartItemId, quantity);
        await refreshCart();
      } finally {
        setLoading(false);
      }
    },
    [refreshCart],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      setLoading(true);
      try {
        await removeFromB2BCart(cartItemId);
        await refreshCart();
      } finally {
        setLoading(false);
      }
    },
    [refreshCart],
  );

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <B2BCartContext.Provider
      value={{
        isB2B,
        isOpen,
        openCart,
        closeCart,
        cart,
        cartCount,
        loading,
        refreshCart,
        addItem,
        updateItem,
        removeItem,
        checkoutUrl,
      }}
    >
      {children}
    </B2BCartContext.Provider>
  );
}

export function useB2BCart() {
  return useContext(B2BCartContext);
}
