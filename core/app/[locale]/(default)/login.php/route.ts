import { NextRequest } from 'next/server';
import { getLocale } from 'next-intl/server';

import { redirect } from '~/i18n/navigation-server';

// GI: old store links (e.g. password reset emails: /login.php?action=change_password&c=…&t=…) go to
// /login with the query string intact, where the login page forwards reset links on.
export const GET = async (request: NextRequest) => {
  const locale = await getLocale();
  const { search } = request.nextUrl;

  return await redirect({ href: `/login${search}`, locale });
};
