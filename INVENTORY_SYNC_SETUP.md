# Wholesaler Inventory Sync Setup

## Overview
Automatically sync inventory levels from your wholesaler's API to BigCommerce.

## Setup Steps

### 1. Add Environment Variables

Add these to your `.env.local` (local) and Vercel dashboard (production):

```bash
# Wholesaler API Configuration
WHOLESALER_API_URL=https://your-wholesaler.com/api/inventory
WHOLESALER_API_KEY=your_wholesaler_api_key_here

# BigCommerce API (for inventory updates via REST)
BIGCOMMERCE_ACCESS_TOKEN=your_bigcommerce_access_token
BIGCOMMERCE_STORE_HASH=your_store_hash

# Security secret for the sync endpoint
INVENTORY_SYNC_SECRET=generate_a_random_secret_here
```

### 2. Get BigCommerce Access Token

If you don't have a REST API token yet:

1. Go to BigCommerce Admin > Settings > API > API Accounts
2. Click "Create API Account"
3. Name: "Inventory Sync"
4. **Required Scopes:**
   - Products: `modify`
   - Information & Settings: `read-only`
5. Save and copy the Access Token

### 3. Test the Sync

Test manually first:

```bash
curl -X POST https://your-site.vercel.app/api/sync-inventory \
  -H "Authorization: Bearer your_INVENTORY_SYNC_SECRET" \
  -H "Content-Type: application/json"
```

Or check status:

```bash
curl https://your-site.vercel.app/api/sync-inventory \
  -H "Authorization: Bearer your_INVENTORY_SYNC_SECRET"
```

### 4. Set Up Automated Sync (Choose One)

#### Option A: Vercel Cron Jobs (Recommended)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/sync-inventory",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Schedule options:**
- `0 */6 * * *` - Every 6 hours
- `0 */12 * * *` - Every 12 hours (twice daily)
- `0 2 * * *` - Daily at 2 AM
- `0 2 * * 1-5` - Weekdays at 2 AM

**Note:** Vercel cron requires Pro plan. Free tier: use Option B.

#### Option B: External Cron Service

Use a service like:
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **GitHub Actions** (free)

Set up to POST to your endpoint with the Authorization header.

#### Option C: GitHub Actions

Create `.github/workflows/sync-inventory.yml`:

```yaml
name: Sync Inventory

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Inventory
        run: |
          curl -X POST ${{ secrets.SITE_URL }}/api/sync-inventory \
            -H "Authorization: Bearer ${{ secrets.INVENTORY_SYNC_SECRET }}" \
            -H "Content-Type: application/json"
```

Add secrets in GitHub repo settings:
- `SITE_URL`: Your production URL
- `INVENTORY_SYNC_SECRET`: Your sync secret

### 5. Customize for Your Wholesaler

Edit `core/app/api/sync-inventory/route.ts`:

**Update the `fetchWholesalerInventory` function** to match your wholesaler's API:

```typescript
async function fetchWholesalerInventory(): Promise<WholesalerInventoryItem[]> {
  // Example for different API formats:

  // REST API with pagination
  const allItems = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${wholesalerApiUrl}/inventory?page=${page}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${wholesalerApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    allItems.push(...data.items);
    hasMore = data.hasMore || data.next_page;
    page++;
  }

  return allItems;
}
```

**Common API formats:**

**Format 1: Simple array**
```json
[
  { "sku": "ABC-123", "stock": 50 },
  { "sku": "XYZ-789", "stock": 25 }
]
```

**Format 2: Nested response**
```json
{
  "data": {
    "products": [
      { "item_code": "ABC-123", "available_qty": 50 },
      { "item_code": "XYZ-789", "available_qty": 25 }
    ]
  }
}
```

**Format 3: CSV file**
```typescript
// If wholesaler provides CSV:
const csvResponse = await fetch(wholesalerApiUrl);
const csvText = await csvResponse.text();

const lines = csvText.split('\n').slice(1); // Skip header
return lines.map(line => {
  const [sku, quantity] = line.split(',');
  return { sku: sku.trim(), quantity: parseInt(quantity) };
});
```

### 6. Monitoring & Logs

**View logs in Vercel:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Logs" or "Functions"
4. Filter by `/api/sync-inventory`

**Success response:**
```json
{
  "success": true,
  "summary": {
    "total": 150,
    "updated": 150,
    "errors": 0
  },
  "timestamp": "2025-01-13T12:00:00Z"
}
```

**Error handling:**
- Failed items are logged in the `errors` array
- Sync continues even if individual items fail
- Rate limiting prevents API throttling

### 7. SKU Mapping (If Needed)

If your wholesaler uses different SKUs than BigCommerce:

Create a mapping file `core/lib/sku-mappings.ts`:

```typescript
export const SKU_MAPPINGS: Record<string, string> = {
  'WHOLESALER-SKU-1': 'BC-SKU-1',
  'WHOLESALER-SKU-2': 'BC-SKU-2',
  // ... etc
};

export function mapWholesalerSku(wholesalerSku: string): string {
  return SKU_MAPPINGS[wholesalerSku] || wholesalerSku;
}
```

Then update the sync route:

```typescript
const inventoryUpdates: BigCommerceInventoryUpdate[] = batch.map(item => ({
  sku: mapWholesalerSku(item.sku),  // Map SKU
  inventory_level: item.quantity,
  inventory_warning_level: Math.max(5, Math.floor(item.quantity * 0.1)),
}));
```

### 8. Advanced: Selective Sync

Only sync specific products:

```typescript
async function fetchWholesalerInventory(): Promise<WholesalerInventoryItem[]> {
  const allInventory = await fetchAllInventoryFromWholesaler();

  // Filter to only products you want to sync
  return allInventory.filter(item => {
    // Option 1: Whitelist specific SKUs
    const syncSkus = ['SKU-1', 'SKU-2', 'SKU-3'];
    return syncSkus.includes(item.sku);

    // Option 2: Filter by SKU pattern
    // return item.sku.startsWith('TOOL-');

    // Option 3: Only sync if quantity > 0
    // return item.quantity > 0;
  });
}
```

## Troubleshooting

### "Wholesaler API credentials not configured"
- Check `.env.local` or Vercel environment variables
- Variable names must match exactly

### "BigCommerce API credentials not configured"
- Ensure `BIGCOMMERCE_ACCESS_TOKEN` and `BIGCOMMERCE_STORE_HASH` are set
- Verify Access Token has `modify` scope for Products

### "Unauthorized" (401)
- Check `INVENTORY_SYNC_SECRET` matches in both request and environment
- Include `Bearer ` prefix in Authorization header

### Inventory not updating
1. Check BigCommerce SKUs match wholesaler SKUs exactly (case-sensitive)
2. Verify products exist in BigCommerce
3. Check sync logs for specific errors
4. Test with a single SKU first

### Rate limiting errors
- Increase delay between batches (line with `setTimeout`)
- Reduce batch size from 50 to 25

## Security Notes

- **Never commit `.env.local`** - it contains secrets
- Use strong random string for `INVENTORY_SYNC_SECRET` (32+ characters)
- Rotate API keys regularly
- Monitor sync logs for suspicious activity
- Consider IP whitelisting if using external cron

## FAQ

**Q: How long does a sync take?**
A: ~1-2 seconds per 50 items. 1000 items ≈ 40 seconds.

**Q: What if sync fails mid-way?**
A: Each batch is independent. Failed batches are logged, successful batches are still applied.

**Q: Can I run sync manually?**
A: Yes! Use the curl command or visit `/api/sync-inventory` with proper authorization.

**Q: Will this affect my product catalog?**
A: No, it only updates inventory levels. It doesn't create, delete, or modify products.

**Q: What about variant inventory?**
A: Yes, works with variants using variant SKUs.

## Next Steps

1. Set up environment variables
2. Test with a few SKUs manually
3. Configure automated schedule
4. Monitor first few syncs
5. Expand to full inventory

Need help? Check the logs in Vercel or contact support.
