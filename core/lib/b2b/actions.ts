'use server';

import { auth } from '~/auth';

import { generateCheckoutSSOUrl } from './sso';

/**
 * Generates a fresh SSO checkout URL at the moment the user initiates checkout.
 * Called from the cart drawer — keeps the token out of __NEXT_DATA__ entirely.
 */
export async function getB2BCheckoutUrl(): Promise<string> {
  const session = await auth();
  if (!session?.user?.email) return '';
  const portalBase = process.env.B2B_PORTAL_URL ?? '';
  if (!portalBase) return '';
  return generateCheckoutSSOUrl(session.user.email, portalBase);
}
