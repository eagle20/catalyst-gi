'use client';

import { useB2B } from './context';

export function B2BOnly({ children }: { children: React.ReactNode }) {
  const isB2B = useB2B();

  if (!isB2B) return null;

  return <>{children}</>;
}

export function B2COnly({ children }: { children: React.ReactNode }) {
  const isB2B = useB2B();

  if (isB2B) return null;

  return <>{children}</>;
}
