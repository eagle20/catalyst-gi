import { isB2BCustomer } from '~/lib/user';

import { B2BContextProvider } from './context';

export async function B2BProvider({ children }: { children: React.ReactNode }) {
  const isB2B = await isB2BCustomer();

  return <B2BContextProvider isB2B={isB2B}>{children}</B2BContextProvider>;
}
