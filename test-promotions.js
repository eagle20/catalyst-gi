// Quick test script to verify BigCommerce Promotions API
// Using native fetch (Node 18+)

const STORE_HASH = 'wlbjjbyoi5';
const ACCESS_TOKEN = 'e5yn75w1fr4cylbxvz9odm8caeizbd4';

async function testPromotionsAPI() {
  console.log('Testing BigCommerce Promotions API...\n');

  try {
    // Test 1: List all promotions (without status filter first)
    console.log('1. Fetching all promotions...');
    const response1 = await fetch(
      `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/promotions`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Auth-Token': ACCESS_TOKEN,
        },
      }
    );

    console.log(`   Status: ${response1.status} ${response1.statusText}`);

    if (!response1.ok) {
      const errorText = await response1.text();
      console.log(`   Error response: ${errorText}`);
      throw new Error(`API Error: ${response1.status} ${response1.statusText}`);
    }

    const data1 = await response1.json();
    console.log(`✓ Found ${data1.data?.length || 0} promotions total\n`);

    if (data1.data && data1.data.length > 0) {
      data1.data.forEach((promo, index) => {
        console.log(`Promotion ${index + 1}:`);
        console.log(`  - ID: ${promo.id}`);
        console.log(`  - Name: ${promo.name}`);
        console.log(`  - Status: ${promo.status}`);
        console.log(`  - Rules:`, JSON.stringify(promo.rules, null, 2));
        console.log('');
      });
    } else {
      console.log('⚠️  No active promotions found. You need to create one in BigCommerce Admin.');
      console.log('   Go to: Marketing → Promotions → Create Promotion\n');
    }

    // Test 2: Get product by SKU to find product ID
    console.log('2. Looking up product by SKU "MLW 0880-20"...');
    const response2 = await fetch(
      `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/catalog/products?sku=MLW%200880-20`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Auth-Token': ACCESS_TOKEN,
        },
      }
    );

    if (!response2.ok) {
      throw new Error(`API Error: ${response2.status} ${response2.statusText}`);
    }

    const data2 = await response2.json();

    if (data2.data && data2.data.length > 0) {
      const product = data2.data[0];
      console.log(`✓ Found product:`);
      console.log(`  - ID: ${product.id}`);
      console.log(`  - Name: ${product.name}`);
      console.log(`  - SKU: ${product.sku}`);
      console.log('');

      // Test 3: Check promotions for this specific product
      console.log(`3. Checking promotions for product ID ${product.id}...`);
      const response3 = await fetch(
        `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/promotions?product_id=${product.id}&status=ACTIVE`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Auth-Token': ACCESS_TOKEN,
          },
        }
      );

      const data3 = await response3.json();
      console.log(`✓ Found ${data3.data?.length || 0} promotions for this product\n`);

      if (data3.data && data3.data.length > 0) {
        data3.data.forEach((promo) => {
          console.log(`✅ Promotion "${promo.name}" applies to this product!`);
          const giftItems = promo.rules
            .filter(rule => rule.action?.gift_item)
            .map(rule => rule.action.gift_item);

          if (giftItems.length > 0) {
            console.log('   Free gift items:');
            giftItems.forEach(gift => {
              console.log(`   - Product ID: ${gift.product_id || 'N/A'}`);
              console.log(`   - Variant ID: ${gift.variant_id || 'N/A'}`);
              console.log(`   - Quantity: ${gift.quantity}`);
            });
          }
          console.log('');
        });
      } else {
        console.log('⚠️  No promotions found for this product.');
        console.log(`   You need to create a promotion that targets product ID ${product.id}\n`);
      }
    } else {
      console.log('❌ Product not found with SKU "MLW 0880-20"');
      console.log('   Please verify the SKU is correct.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testPromotionsAPI();
