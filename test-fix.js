// Test the fix for promotion detection
const STORE_HASH = 'wlbjjbyoi5';
const ACCESS_TOKEN = 'e5yn75w1fr4cylbxvz9odm8caeizbd4';

async function testFix() {
  console.log('Testing promotion fix...\n');

  // Fetch enabled promotions
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/promotions?status=ENABLED`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Auth-Token': ACCESS_TOKEN,
      },
    }
  );

  const data = await response.json();
  console.log(`✓ Found ${data.data.length} ENABLED promotions\n`);

  // Test product 507926 (MLW 0880-20)
  const productId = 507926;
  console.log(`Testing product ID ${productId}...\n`);

  const matchingPromotions = data.data.filter((promo) => {
    // Must be enabled and have gift items
    if (promo.status !== 'ENABLED') return false;
    if (!promo.rules.some((rule) => rule.action?.gift_item)) return false;

    // Check if any rule applies to this product
    return promo.rules.some((rule) => {
      // Check the correct path: condition.cart.items.products
      const products = rule.condition?.cart?.items?.products;

      if (products && products.length > 0) {
        return products.includes(productId);
      }

      return false;
    });
  });

  console.log(`✅ Found ${matchingPromotions.length} promotions for product ${productId}:\n`);

  matchingPromotions.forEach((promo) => {
    console.log(`  - ID: ${promo.id}`);
    console.log(`  - Name: ${promo.name}`);

    // Extract gift items
    promo.rules.forEach((rule) => {
      if (rule.action?.gift_item) {
        console.log(`  - Gift Product ID: ${rule.action.gift_item.product_id || 'N/A'}`);
        console.log(`  - Gift Variant ID: ${rule.action.gift_item.variant_id || 'N/A'}`);
      }
    });
    console.log('');
  });
}

testFix().catch(console.error);
