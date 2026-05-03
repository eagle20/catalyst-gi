'use client';

import { createContext, useContext } from 'react';

const B2BContext = createContext<boolean>(false);

export function B2BContextProvider({
  isB2B,
  children,
}: {
  isB2B: boolean;
  children: React.ReactNode;
}) {
  return <B2BContext.Provider value={isB2B}>{children}</B2BContext.Provider>;
}

export function useB2B(): boolean {
  return useContext(B2BContext);
}
