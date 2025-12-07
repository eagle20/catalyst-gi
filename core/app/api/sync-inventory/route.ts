import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to sync inventory from wholesaler API to BigCommerce
 *
 * Usage:
 * - Set up as cron job in Vercel (vercel.json)
 * - Or call manually: POST /api/sync-inventory
 * - Requires WHOLESALER_API_KEY and INVENTORY_SYNC_SECRET in env
 */

interface WholesalerInventoryItem {
  sku: string;
  quantity: number;
  // Add other fields from your wholesaler API
}

interface BigCommerceInventoryUpdate {
  sku: string;
  inventory_level: number;
  inventory_warning_level?: number;
}

async function fetchWholesalerInventory(): Promise<WholesalerInventoryItem[]> {
  const wholesalerApiUrl = process.env.WHOLESALER_API_URL;
  const wholesalerApiKey = process.env.WHOLESALER_API_KEY;

  if (!wholesalerApiUrl || !wholesalerApiKey) {
    throw new Error('Wholesaler API credentials not configured');
  }

  // Example: Adjust this to match your wholesaler's API
  const response = await fetch(wholesalerApiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${wholesalerApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Wholesaler API error: ${response.status}`);
  }

  const data = await response.json();

  // Transform wholesaler data to standard format
  // Adjust based on your wholesaler's response structure
  return data.items || data.products || data;
}

async function updateBigCommerceInventory(
  items: WholesalerInventoryItem[]
): Promise<{ updated: number; errors: string[] }> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !accessToken) {
    throw new Error('BigCommerce API credentials not configured');
  }

  const errors: string[] = [];
  let updated = 0;

  // BigCommerce API v3 - Update inventory by SKU
  // Batching for efficiency (max 50 items per request)
  const batchSize = 50;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Map to BigCommerce format
    const inventoryUpdates: BigCommerceInventoryUpdate[] = batch.map(item => ({
      sku: item.sku,
      inventory_level: item.quantity,
      inventory_warning_level: Math.max(5, Math.floor(item.quantity * 0.1)), // 10% or min 5
    }));

    try {
      const response = await fetch(
        `https://api.bigcommerce.com/stores/${storeHash}/v3/inventory/adjustments/absolute`,
        {
          method: 'POST',
          headers: {
            'X-Auth-Token': accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Wholesaler inventory sync',
            items: inventoryUpdates.map(item => ({
              item_type: 'variant',
              sku: item.sku,
              quantity: item.inventory_level,
            })),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        errors.push(`Batch ${i / batchSize + 1} failed: ${error}`);
        continue;
      }

      updated += batch.length;

      // Rate limiting: BigCommerce has API limits
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      errors.push(`Batch ${i / batchSize + 1} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { updated, errors };
}

export async function POST(request: NextRequest) {
  try {
    // Security: Verify request is authorized
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.INVENTORY_SYNC_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'Inventory sync not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Inventory Sync] Starting sync...');

    // Step 1: Fetch inventory from wholesaler
    const wholesalerInventory = await fetchWholesalerInventory();
    console.log(`[Inventory Sync] Fetched ${wholesalerInventory.length} items from wholesaler`);

    // Step 2: Update BigCommerce inventory
    const result = await updateBigCommerceInventory(wholesalerInventory);

    console.log(`[Inventory Sync] Updated ${result.updated} items`);
    if (result.errors.length > 0) {
      console.error('[Inventory Sync] Errors:', result.errors);
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: wholesalerInventory.length,
        updated: result.updated,
        errors: result.errors.length,
      },
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Inventory Sync] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint for status/testing
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.INVENTORY_SYNC_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ready',
    config: {
      wholesalerApiConfigured: !!process.env.WHOLESALER_API_URL,
      bigCommerceConfigured: !!process.env.BIGCOMMERCE_STORE_HASH,
      secretConfigured: !!process.env.INVENTORY_SYNC_SECRET,
    },
    timestamp: new Date().toISOString(),
  });
}
