import 'server-only';

import { request } from 'https';
import { z } from 'zod';

// ORS Nasco Price & Availability API (Workato API gateway).
// Docs: "ORS Nasco Price & Availability REST API" (v2.0). The endpoints are GET
// requests that carry a JSON body, which fetch() refuses to send, so requests
// go through node's https module.

const DEFAULT_TOKEN_URL = 'https://apim.workato.com/oauth2/token';
const DEFAULT_WAREHOUSE_URL = 'https://apim.workato.com/orsnasco/priceavailability/warehouse';

// Observed at ~6.5s per 100 products; keep batches at that size.
const MAX_PRODUCTS_PER_REQUEST = 100;

const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

const WarehouseRowSchema = z.object({
  orsProduct: z.string(),
  price: z.number(),
  uom: z.string(),
  unitConversion: z.string().optional(),
  warehouseLocation: z.string(),
  warehouseAvailability: z.number(),
});

const WarehouseResponseSchema = z.object({
  products: z.array(WarehouseRowSchema),
});

export type OrsWarehouseRow = z.infer<typeof WarehouseRowSchema>;

export interface OrsStock {
  orsProduct: string;
  // Contract price per ORS selling unit (uom).
  price: number;
  uom: string;
  // e.g. "12 EA/PK"; absent on older responses.
  unitConversion?: string;
  quantity: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch(process.env.ORS_NASCO_TOKEN_URL ?? DEFAULT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: getEnv('ORS_NASCO_CLIENT_ID'),
      client_secret: getEnv('ORS_NASCO_CLIENT_SECRET'),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`ORS token request failed: ${response.status} ${response.statusText}`);
  }

  const { access_token: token, expires_in: expiresIn } = TokenSchema.parse(await response.json());

  // Refresh a minute early so a token never expires mid-sync.
  cachedToken = { token, expiresAt: Date.now() + (expiresIn - 60) * 1000 };

  return token;
}

function getWithBody(url: string, token: string, body: unknown): Promise<unknown> {
  const payload = JSON.stringify(body);
  const target = new URL(url);

  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${token}`,
        },
        timeout: 60_000,
      },
      (res) => {
        let data = '';

        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`ORS request failed: ${res.statusCode} ${data.slice(0, 200)}`));

            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('ORS response was not valid JSON'));
          }
        });
      },
    );

    req.on('timeout', () => req.destroy(new Error('ORS request timed out')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Price and per-warehouse availability for the given ORS product codes.
 * Products ORS doesn't recognize are simply absent from the result.
 */
export async function getOrsWarehouseAvailability(
  orsProducts: string[],
): Promise<OrsWarehouseRow[]> {
  const url = process.env.ORS_NASCO_WAREHOUSE_API_URL ?? DEFAULT_WAREHOUSE_URL;
  const token = await getAccessToken();
  const rows: OrsWarehouseRow[] = [];

  for (let i = 0; i < orsProducts.length; i += MAX_PRODUCTS_PER_REQUEST) {
    const batch = orsProducts.slice(i, i + MAX_PRODUCTS_PER_REQUEST);
    // eslint-disable-next-line no-await-in-loop -- sequential on purpose, to stay gentle on ORS
    const response = await getWithBody(url, token, {
      products: batch.map((orsProduct) => ({ orsProduct })),
    });

    rows.push(...WarehouseResponseSchema.parse(response).products);
  }

  return rows;
}

// ORS answers an unknown product code with zero-filled rows (price 0, empty
// uom) rather than an error. Treat those as "not found" so a mistyped code can
// never be read as a $0 price.
function isKnownProduct(row: OrsWarehouseRow): boolean {
  return row.uom !== '' && row.price > 0;
}

/**
 * Stock and contract price at a single ORS warehouse (e.g. "FRES"), keyed by
 * ORS product code. A product with no row for that warehouse is reported with
 * quantity 0 if ORS returned it for other warehouses. Unknown codes are omitted.
 */
export async function getOrsStockAtWarehouse(
  orsProducts: string[],
  warehouse: string,
): Promise<Map<string, OrsStock>> {
  const rows = await getOrsWarehouseAvailability(orsProducts);
  const stock = new Map<string, OrsStock>();

  for (const row of rows.filter(isKnownProduct)) {
    const existing = stock.get(row.orsProduct);
    const quantity = row.warehouseLocation === warehouse ? row.warehouseAvailability : 0;

    stock.set(row.orsProduct, {
      orsProduct: row.orsProduct,
      price: row.price,
      uom: row.uom,
      unitConversion: row.unitConversion,
      quantity: (existing?.quantity ?? 0) + quantity,
    });
  }

  return stock;
}
