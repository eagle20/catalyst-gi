/**
 * Tags BigCommerce products as ORS Nasco–fulfilled pilot items.
 *
 *   npx tsx --conditions=react-server scripts/ors-pilot-tag.ts <pilot.csv> --margin=0.3 --buffer=2 [--apply]
 *
 * The pilot CSV (kept out of the repo) needs `ors_sku` and `bigcommerce_sku` columns.
 * Rows without a BigCommerce SKU are reported as waiting on content and skipped.
 *
 * Without --apply nothing is written. With --apply only the tags are written:
 *   - metafields ors.product_code / ors.warehouse (app-only, never shown to shoppers)
 *   - bin_picking_number "ORS-<warehouse> <code>" so staff see it on pick lists
 * Price, cost and stock are left to the sync; this run only previews them.
 */
import { readFileSync } from 'fs';

import { getOrsStockAtWarehouse } from '../client/ors-nasco';

const WAREHOUSE = 'FRES';
const NAMESPACE = 'ors';

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  cost_price: number;
  inventory_tracking: string;
  inventory_level: number;
  bin_picking_number: string;
  is_visible: boolean;
  variants?: unknown[];
}

interface Metafield {
  id: number;
  key: string;
  value: string;
}

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--'));
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const apply = args.includes('--apply');
const margin = Number(flag('margin'));
const buffer = Number(flag('buffer'));

if (!csvPath || !(margin > 0 && margin < 1) || !(buffer >= 0)) {
  console.error('Usage: ors-pilot-tag.ts <pilot.csv> --margin=0.3 --buffer=2 [--apply]');
  process.exit(1);
}

const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
const token = process.env.BIGCOMMERCE_ACCESS_TOKEN;

if (!storeHash || !token) {
  throw new Error('BIGCOMMERCE_STORE_HASH and BIGCOMMERCE_ACCESS_TOKEN must be set');
}

const api = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog`;

async function bc<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      'X-Auth-Token': token ?? '',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`BigCommerce ${init?.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as { data: T }).data;
}

function readPilot(path: string) {
  const [header = '', ...lines] = readFileSync(path, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
  const columns = header.split(',');
  const orsCol = columns.indexOf('ors_sku');
  const bcCol = columns.indexOf('bigcommerce_sku');

  if (orsCol < 0 || bcCol < 0) {
    throw new Error('Pilot CSV needs ors_sku and bigcommerce_sku columns');
  }

  return lines.map((line) => {
    const cells = line.split(',');

    return { orsCode: cells[orsCol]?.trim() ?? '', bcSku: cells[bcCol]?.trim() ?? '' };
  });
}

const money = (n: number) => `$${n.toFixed(2)}`;

async function main() {
  const pilot = readPilot(csvPath ?? '');
  const ready = pilot.filter((p) => p.bcSku);
  const waiting = pilot.filter((p) => !p.bcSku);

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} — ${pilot.length} pilot items, ${ready.length} in BigCommerce, ${waiting.length} waiting on content`);
  console.log(`Warehouse ${WAREHOUSE}, margin ${margin * 100}%, stock buffer ${buffer}\n`);

  const stock = await getOrsStockAtWarehouse(ready.map((p) => p.orsCode), WAREHOUSE);
  let problems = 0;

  for (const { orsCode, bcSku } of ready) {
    // eslint-disable-next-line no-await-in-loop
    const [product] = await bc<Product[]>(
      `/products?sku=${encodeURIComponent(bcSku)}&include=variants&include_fields=sku,name,price,cost_price,inventory_tracking,inventory_level,bin_picking_number,is_visible`,
    );
    const ors = stock.get(orsCode);

    console.log(`${orsCode}  ->  ${bcSku}`);

    if (!product) {
      console.log('  !! SKU not found in BigCommerce — skipped\n');
      problems += 1;
      continue;
    }

    if (!ors) {
      console.log('  !! ORS does not recognise this code — skipped\n');
      problems += 1;
      continue;
    }

    if ((product.variants?.length ?? 0) > 1) {
      console.log(`  !! Product has ${product.variants?.length} variants; pilot supports single-SKU products only — skipped\n`);
      problems += 1;
      continue;
    }

    if (ors.unitConversion && !ors.unitConversion.startsWith('1 ')) {
      console.log(`  !! ORS sells this as ${ors.unitConversion}; needs a unit decision — skipped\n`);
      problems += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const metafields = await bc<Metafield[]>(`/products/${product.id}/metafields?namespace=${NAMESPACE}`);
    const wanted = { product_code: orsCode, warehouse: WAREHOUSE };
    const bin = `ORS-${WAREHOUSE} ${orsCode}`;
    // The margin is a floor: a current price already above it is kept.
    const floorPrice = Math.round((ors.price / (1 - margin)) * 100) / 100;
    const newPrice = Math.max(product.price, floorPrice);
    const newStock = Math.max(0, ors.quantity - buffer);

    console.log(`  ${product.name.slice(0, 90)}${product.is_visible ? '' : '  [hidden]'}`);
    console.log('  TAGS (written with --apply):');
    console.log(`    bin picking number : "${product.bin_picking_number}"  ->  "${bin}"`);

    for (const [key, value] of Object.entries(wanted)) {
      const current = metafields.find((m) => m.key === key);

      console.log(`    metafield ors.${key.padEnd(12)}: ${current ? `"${current.value}"` : '(none)'}  ->  "${value}"`);
    }

    console.log('  SYNC PREVIEW (not written; step 3):');
    console.log(`    cost price : ${money(product.cost_price)}  ->  ${money(ors.price)}`);
    console.log(
      `    price      : ${money(product.price)}  ->  ${money(newPrice)}${newPrice === product.price ? ` (kept; floor ${money(floorPrice)})` : ' (raised to floor)'}`,
    );
    console.log(`    stock      : ${product.inventory_tracking === 'none' ? 'untracked' : product.inventory_level}  ->  ${newStock} (Fresno ${ors.quantity} - buffer ${buffer})\n`);

    if (!apply) continue;

    // eslint-disable-next-line no-await-in-loop
    await bc(`/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify({ bin_picking_number: bin }),
    });

    for (const [key, value] of Object.entries(wanted)) {
      const current = metafields.find((m) => m.key === key);
      const body = JSON.stringify({ namespace: NAMESPACE, key, value, permission_set: 'app_only' });

      // eslint-disable-next-line no-await-in-loop
      await (current
        ? bc(`/products/${product.id}/metafields/${current.id}`, { method: 'PUT', body })
        : bc(`/products/${product.id}/metafields`, { method: 'POST', body }));
    }

    console.log('  tagged.\n');
  }

  if (waiting.length) {
    console.log(`Waiting on content (${waiting.length}): ${waiting.map((p) => p.orsCode).join(', ')}`);
  }

  if (problems) {
    console.log(`\n${problems} item(s) skipped — see !! lines above.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
