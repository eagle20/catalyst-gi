import { NextResponse } from 'next/server';

import { type ProxyFactory } from './compose-proxies';

// GI: serve /customer/current.jwt from our API route at /api/customer/current.jwt.
export const withCustomerJwtRewrite: ProxyFactory = (proxy) => {
  return async (request, event) => {
    if (request.nextUrl.pathname === '/customer/current.jwt') {
      const url = request.nextUrl.clone();

      url.pathname = '/api/customer/current.jwt';

      return NextResponse.rewrite(url);
    }

    return proxy(request, event);
  };
};
