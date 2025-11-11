import { NextRequest, NextResponse } from 'next/server';

import axios from 'axios';

const canonicalDomain = process.env.BIGCOMMERCE_GRAPHQL_API_DOMAIN ?? 'mybigcommerce.com';
const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appClientId = searchParams.get('app_client_id');

  if (!appClientId) {
    return NextResponse.json({ error: 'Missing app_client_id' }, { status: 400 });
  }

  if (!storeHash) {
    console.error('JWT fetch error: BIGCOMMERCE_STORE_HASH not configured');
    return NextResponse.json(
      { error: 'Store configuration error' },
      { status: 500 },
    );
  }

  // Call BigCommerce /customers/current.jwt endpoint
  try {
    const apiUrl = `https://store-${storeHash}.${canonicalDomain}/customer/current.jwt?app_client_id=${appClientId}`;
    const axiosResponse = await axios.get(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ JWT fetched successfully');

    // The JWT is usually in axiosResponse.data.token
    return NextResponse.json({ jwt: axiosResponse.data.token });
  } catch (err: any) {
    // 503 errors are common when customer is not logged in - don't spam logs
    if (err.response?.status === 503) {
      // This is expected when customer is not authenticated, log at debug level
      console.debug('JWT fetch: Customer not authenticated (503)');
    } else {
      // Log other errors for debugging
      console.error('JWT fetch error:', err.message, 'Status:', err.response?.status);
    }

    if (err.response) {
      // Return a more graceful error
      return NextResponse.json(
        { error: 'JWT service temporarily unavailable' },
        { status: err.response.status },
      );
    }
    return NextResponse.json(
      { error: 'JWT service temporarily unavailable' },
      { status: 503 },
    );
  }
}
