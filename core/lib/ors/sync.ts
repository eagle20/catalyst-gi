import 'server-only';

import { getOrsStockAtWarehouse, OrsStock } from '~/client/ors-nasco';

// Products are enrolled by the `ors` metafields that scripts/ors-pilot-tag.ts
// writes (product_code, warehouse); nothing about the pilot lives in code.
const NAMESPACE = 'ors';
const UPDATE_BATCH_SIZE = 10;

interface Metafield {
  key: string;
  value: string;
  resource_id: number;
}

interface Product {
  id: number;
  sku: string;
  price: number;
  cost_price: number;
  inventory_tracking: string;
  inventory_level: number;
  variants?: unknown[];
}

interface ProductUpdate {
  id: number;
  cost_price: number;
  price: number;
  inventory_tracking: 'product';
  inventory_level: number;
}

export interface OrsSyncChange {
  sku: string;
  orsCode: string;
  warehouse: string;
  warehouseQty: number;
  cost: { from: number; to: number };
  price: { from: number; to: number; floor: number };
  stock: { from: number | 'untracked'; to: number };
}

export interface OrsSyncResult {
  dryRun: boolean;
  enrolled: number;
  changed: OrsSyncChange[];
  unchanged: string[];
  skipped: Array<{ sku: string; orsCode: string; reason: string }>;
}

interface Config {
  margin: number;
  buffer: number;
}

function getConfig(): Config {
  const margin = Number(process.env.ORS_SYNC_MARGIN);
  const buffer = Number(process.env.ORS_SYNC_STOCK_BUFFER);

  if (!(margin > 0 && margin < 1)) {
    throw new Error('ORS_SYNC_MARGIN must be a fraction between 0 and 1 (e.g. 0.3)');
  }

  if (!(Number.isInteger(buffer) && buffer >= 0)) {
    throw new Error('ORS_SYNC_STOCK_BUFFER must be a whole number >= 0');
  }

  return { margin, buffer };
}

async function bigcommerce<T>(path: string, init?: RequestInit): Promise<T> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const token = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !token) {
    throw new Error('BIGCOMMERCE_STORE_HASH and BIGCOMMERCE_ACCESS_TOKEN must be set');
  }

  const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/catalog${path}`, {
    ...init,
    headers: { 'X-Auth-Token': token, Accept: 'application/json', 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`BigCommerce ${init?.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

async function getEnrolledProducts(): Promise<Map<number, { orsCode: string; warehouse: string }>> {
  const enrolled = new Map<number, { orsCode?: string; warehouse?: string }>();
  let page = 1;
  let totalPages = 1;

  do {
    // eslint-disable-next-line no-await-in-loop
    const { data, meta } = await bigcommerce<{
      data: Metafield[];
      meta: { pagination: { total_pages: number } };
    }>(`/products/metafields?namespace=${NAMESPACE}&limit=250&page=${page}`);

    for (const { key, value, resource_id: id } of data) {
      const entry = enrolled.get(id) ?? {};

      if (key === 'product_code') entry.orsCode = value;
      if (key === 'warehouse') entry.warehouse = value;
      enrolled.set(id, entry);
    }

    totalPages = meta.pagination.total_pages;
    page += 1;
  } while (page <= totalPages);

  const complete = new Map<number, { orsCode: string; warehouse: string }>();

  for (const [id, { orsCode, warehouse }] of enrolled) {
    if (orsCode && warehouse) complete.set(id, { orsCode, warehouse });
  }

  return complete;
}

async function getProducts(ids: number[]): Promise<Product[]> {
  const products: Product[] = [];

  for (let i = 0; i < ids.length; i += 50) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await bigcommerce<{ data: Product[] }>(
      `/products?id:in=${ids.slice(i, i + 50).join(',')}&limit=50&include=variants` +
        '&include_fields=sku,price,cost_price,inventory_tracking,inventory_level',
    );

    products.push(...data);
  }

  return products;
}

const roundCents = (n: number) => Math.round(n * 100) / 100;

/**
 * Brings enrolled products in line with their ORS warehouse:
 *   - stock    = warehouse quantity minus the safety buffer (tracking turned on)
 *   - cost     = ORS contract price
 *   - price    = raised to cost / (1 - margin) when below it; never lowered
 * ORS or BigCommerce read failures abort the run before anything is written.
 */
export async function runOrsSync({ dryRun }: { dryRun: boolean }): Promise<OrsSyncResult> {
  const { margin, buffer } = getConfig();
  const enrolled = await getEnrolledProducts();
  const products = await getProducts([...enrolled.keys()]);

  const byWarehouse = new Map<string, string[]>();

  for (const { orsCode, warehouse } of enrolled.values()) {
    byWarehouse.set(warehouse, [...(byWarehouse.get(warehouse) ?? []), orsCode]);
  }

  const stock = new Map<string, OrsStock>();

  for (const [warehouse, codes] of byWarehouse) {
    // eslint-disable-next-line no-await-in-loop
    const warehouseStock = await getOrsStockAtWarehouse(codes, warehouse);

    for (const [code, entry] of warehouseStock) stock.set(`${warehouse}:${code}`, entry);
  }

  const result: OrsSyncResult = { dryRun, enrolled: enrolled.size, changed: [], unchanged: [], skipped: [] };
  const updates: Array<ProductUpdate | { id: number; inventory_level: 0 }> = [];
  const zeroStock: Array<{ id: number; inventory_level: 0 }> = [];

  for (const product of products) {
    const tag = enrolled.get(product.id);

    if (!tag) continue;

    const { orsCode, warehouse } = tag;
    const skip = (reason: string) => result.skipped.push({ sku: product.sku, orsCode, reason });
    const ors = stock.get(`${warehouse}:${orsCode}`);

    if (!ors) {
      // A code ORS stops recognising is usually discontinued; stop selling
      // stock we can no longer source, but leave never-synced products alone.
      if (product.inventory_tracking !== 'none' && product.inventory_level > 0) {
        zeroStock.push({ id: product.id, inventory_level: 0 });
        skip('ORS does not recognise this product code; stock set to 0');
      } else {
        skip('ORS does not recognise this product code');
      }

      continue;
    }

    if ((product.variants?.length ?? 0) > 1) {
      skip('product has variants; only single-SKU products are supported');
      continue;
    }

    if (ors.unitConversion && !ors.unitConversion.startsWith('1 ')) {
      skip(`ORS sells this as ${ors.unitConversion}; needs a unit decision`);
      continue;
    }

    const floor = roundCents(ors.price / (1 - margin));
    const update: ProductUpdate = {
      id: product.id,
      cost_price: ors.price,
      price: Math.max(product.price, floor),
      inventory_tracking: 'product',
      inventory_level: Math.max(0, ors.quantity - buffer),
    };
    const tracked = product.inventory_tracking !== 'none';
    const isChange =
      update.cost_price !== product.cost_price ||
      update.price !== product.price ||
      !tracked ||
      update.inventory_level !== product.inventory_level;

    if (!isChange) {
      result.unchanged.push(product.sku);
      continue;
    }

    updates.push(update);
    result.changed.push({
      sku: product.sku,
      orsCode,
      warehouse,
      warehouseQty: ors.quantity,
      cost: { from: product.cost_price, to: update.cost_price },
      price: { from: product.price, to: update.price, floor },
      stock: { from: tracked ? product.inventory_level : 'untracked', to: update.inventory_level },
    });
  }

  for (const id of enrolled.keys()) {
    if (!products.some((p) => p.id === id)) {
      result.skipped.push({ sku: `product #${id}`, orsCode: enrolled.get(id)?.orsCode ?? '', reason: 'product no longer exists' });
    }
  }

  updates.push(...zeroStock);

  if (!dryRun) {
    for (let i = 0; i < updates.length; i += UPDATE_BATCH_SIZE) {
      // eslint-disable-next-line no-await-in-loop
      await bigcommerce('/products', {
        method: 'PUT',
        body: JSON.stringify(updates.slice(i, i + UPDATE_BATCH_SIZE)),
      });
    }
  }

  return result;
}
