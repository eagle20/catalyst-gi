import { z } from 'zod';
import https from 'https';

// OAuth Token Schema
const OAuthTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

// ORS Product Schema for Request
const ORSProductRequestSchema = z.object({
  orsProduct: z.string(),
});

// ORS Product Schema for Response (Summary)
const ORSProductSummarySchema = z.object({
  orsProduct: z.string(),
  price: z.number(),
  uom: z.string(),
  totalAvailability: z.number(),
});

// ORS Product Schema for Response (Warehouse)
const ORSProductWarehouseSchema = z.object({
  orsProduct: z.string(),
  price: z.number(),
  uom: z.string(),
  warehouseAvailability: z.number(),
  warehouseLocation: z.string(),
});

const ORSSummaryResponseSchema = z.object({
  products: z.array(ORSProductSummarySchema),
});

const ORSWarehouseResponseSchema = z.object({
  products: z.array(ORSProductWarehouseSchema),
});

export type ORSProductSummary = z.infer<typeof ORSProductSummarySchema>;
export type ORSProductWarehouse = z.infer<typeof ORSProductWarehouseSchema>;

// Cache for OAuth token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth 2.0 access token for ORS Nasco API
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.ORS_NASCO_CLIENT_ID;
  const clientSecret = process.env.ORS_NASCO_CLIENT_SECRET;
  const tokenUrl = process.env.ORS_NASCO_TOKEN_URL || 'https://apim.workato.com/oauth2/token';

  if (!clientId || !clientSecret) {
    throw new Error('ORS_NASCO_CLIENT_ID and ORS_NASCO_CLIENT_SECRET must be set');
  }

  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    console.log('🔐 [ORS Nasco] Requesting OAuth token from:', tokenUrl);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ORS Nasco] OAuth token request failed:', response.status, response.statusText);
      console.error('❌ [ORS Nasco] Error response:', errorText);
      throw new Error(`Failed to get OAuth token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [ORS Nasco] OAuth token received successfully');
    const parsed = OAuthTokenSchema.parse(data);

    // Cache the token (expires 60 seconds before actual expiry for safety)
    cachedToken = {
      token: parsed.access_token,
      expiresAt: Date.now() + (parsed.expires_in - 60) * 1000,
    };

    return parsed.access_token;
  } catch (error) {
    console.error('❌ [ORS Nasco] Error getting access token:', error);
    throw error;
  }
}

/**
 * Fetch price and summarized availability for ORS Nasco products
 */
export async function getORSPriceAndAvailability(
  orsProductIds: string[],
): Promise<ORSProductSummary[] | null> {
  if (orsProductIds.length === 0) {
    return null;
  }

  // Use warehouse endpoint to check Fresno (FRES) warehouse only
  const apiUrl =
    process.env.ORS_NASCO_WAREHOUSE_API_URL || 'https://apim.workato.com/orsnascotest/priceavailability/warehouse';

  try {
    console.log('🔍 [ORS Nasco] Fetching data for products:', orsProductIds);
    const accessToken = await getAccessToken();

    const requestBody = {
      products: orsProductIds.map((id) => ({ orsProduct: id })),
    };
    const bodyString = JSON.stringify(requestBody);
    console.log('📤 [ORS Nasco] Request to:', apiUrl);
    console.log('📤 [ORS Nasco] Request body:', JSON.stringify(requestBody, null, 2));

    // Use native https module to support GET with body
    const url = new URL(apiUrl);
    const data = await new Promise<string>((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyString),
          Authorization: `Bearer ${accessToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            console.error(
              `❌ [ORS Nasco] API request failed: ${res.statusCode} ${res.statusMessage}`,
            );
            console.error('❌ [ORS Nasco] Error response:', responseData);
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ [ORS Nasco] Request error:', error);
        reject(error);
      });

      // Write body to GET request
      req.write(bodyString);
      req.end();
    });

    console.log('📥 [ORS Nasco] Response data:', data);

    const parsedData = JSON.parse(data);
    const warehouseParsed = ORSWarehouseResponseSchema.safeParse(parsedData);

    if (!warehouseParsed.success) {
      console.error('❌ [ORS Nasco] Failed to parse warehouse response:', warehouseParsed.error);
      console.error('❌ [ORS Nasco] Raw data:', parsedData);

      return null;
    }

    // Filter for Fresno (FRES) warehouse only and convert to summary format
    const fresnoProducts = warehouseParsed.data.products
      .filter((p) => p.warehouseLocation === 'FRES')
      .map((p) => ({
        orsProduct: p.orsProduct,
        price: p.price,
        uom: p.uom,
        totalAvailability: p.warehouseAvailability,
      }));

    // Group by product ID in case there are duplicates (shouldn't be with FRES filter)
    const productMap = new Map<string, ORSProductSummary>();
    fresnoProducts.forEach((p) => {
      const existing = productMap.get(p.orsProduct);
      if (existing) {
        existing.totalAvailability += p.totalAvailability;
      } else {
        productMap.set(p.orsProduct, p);
      }
    });

    const result = Array.from(productMap.values());
    console.log('✅ [ORS Nasco] Successfully fetched Fresno warehouse data');
    console.log(`   Found ${result.length} products with Fresno inventory`);
    return result;
  } catch (error) {
    console.error('❌ [ORS Nasco] Error fetching price and availability:', error);

    return null;
  }
}

/**
 * Fetch price and warehouse availability for ORS Nasco products
 */
export async function getORSWarehouseAvailability(
  orsProductIds: string[],
): Promise<ORSProductWarehouse[] | null> {
  if (orsProductIds.length === 0) {
    return null;
  }

  const apiUrl =
    process.env.ORS_NASCO_WAREHOUSE_API_URL ||
    'https://apim.workato.com/orsnascotest/priceavailability/warehouse';

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        products: orsProductIds.map((id) => ({ orsProduct: id })),
      }),
    });

    if (!response.ok) {
      console.error(
        `❌ [ORS Nasco] Warehouse API request failed: ${response.status} ${response.statusText}`,
      );

      return null;
    }

    const data = await response.json();
    const parsed = ORSWarehouseResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('❌ [ORS Nasco] Failed to parse warehouse response:', parsed.error);

      return null;
    }

    return parsed.data.products;
  } catch (error) {
    console.error('❌ [ORS Nasco] Error fetching warehouse availability:', error);

    return null;
  }
}
