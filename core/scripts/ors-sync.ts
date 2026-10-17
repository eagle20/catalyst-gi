/**
 * Runs the ORS stock/price sync from a terminal (same code as /api/cron/ors-sync).
 *
 *   npx tsx --conditions=react-server scripts/ors-sync.ts          # dry run
 *   npx tsx --conditions=react-server scripts/ors-sync.ts --apply  # write changes
 *
 * Needs the ORS_NASCO_*, ORS_SYNC_* and BIGCOMMERCE_* variables in the environment.
 */
import { runOrsSync } from '../lib/ors/sync';

const money = (n: number) => `$${n.toFixed(2)}`;

async function main() {
  const apply = process.argv.includes('--apply');
  const result = await runOrsSync({ dryRun: !apply });

  console.log(`${apply ? 'APPLIED' : 'DRY RUN'} — ${result.enrolled} enrolled products\n`);

  for (const c of result.changed) {
    const price =
      c.price.to === c.price.from
        ? `${money(c.price.from)} (kept, floor ${money(c.price.floor)})`
        : `${money(c.price.from)} -> ${money(c.price.to)} (raised to floor)`;

    console.log(`${c.sku}  [${c.orsCode} @ ${c.warehouse}: ${c.warehouseQty}]`);
    console.log(`  cost  ${money(c.cost.from)} -> ${money(c.cost.to)}`);
    console.log(`  price ${price}`);
    console.log(`  stock ${c.stock.from} -> ${c.stock.to}\n`);
  }

  if (result.unchanged.length) console.log(`Unchanged: ${result.unchanged.join(', ')}`);

  for (const s of result.skipped) console.log(`SKIPPED ${s.sku} (${s.orsCode}): ${s.reason}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
