import { cache } from 'react';

import { auth } from '~/auth';
import { getCustomerGroupId } from '~/client/queries/get-customer';

export interface User {
  id: string;
  name: string;
  email: string;
  cartId: string;
}

export async function getUser(): Promise<User | undefined> {
  const session = await auth();

  if (!session || !session.user) {
    return undefined;
  }

  return {
    id: session.user.id || '',
    name: session.user.name || '',
    email: session.user.email || '',
    cartId: session.user.cartId || '',
  };
}

const B2B_GROUP_KEYWORD = process.env.B2B_GROUP_KEYWORD ?? 'b2b';

/**
 * Returns true if the current logged-in customer belongs to a B2B customer group.
 * Detection is based on whether the group name contains B2B_GROUP_KEYWORD (default: "b2b"),
 * case-insensitive. Result is memoized per request via React cache().
 */
export const isB2BCustomer = cache(async (): Promise<boolean> => {
  const session = await auth();

  if (!session?.user) return false;

  try {
    const { data } = await getCustomerGroupId();
    const groupName = data?.customer?.customerGroupName ?? '';
    return groupName.toLowerCase().includes(B2B_GROUP_KEYWORD.toLowerCase());
  } catch {
    return false;
  }
});
