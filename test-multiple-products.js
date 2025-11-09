// Test multiple products with promotions
const STORE_HASH = 'wlbjjbyoi5';
const ACCESS_TOKEN = 'e5yn75w1fr4cylbxvz9odm8caeizbd4';

const TEST_PRODUCTS = [
  { id: 507926, name: 'MLW 0880-20' },
  { id: 531974, name: 'Product with FREE BATTERY 48-11-1881' },
  { id: 871825, name: 'Product with COPPER TUBING CUTTER KIT' },
  { id: 673526, name: 'Product with FREE BATTERY 48-11-1865' },
];

async function testMultipleProducts() {
  console.log('Testing multiple products with promotions...\n');

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

  for (const testProduct of TEST_PRODUCTS) {
    const matchingPromotions = data.data.filter((promo) => {
      if (promo.status !== 'ENABLED') return false;
      if (!promo.rules.some((rule) => rule.action?.gift_item)) return false;

      return promo.rules.some((rule) => {
        const products = rule.condition?.cart?.items?.products;
        if (products && products.length > 0) {
          return products.includes(testProduct.id);
        }
        return false;
      });
    });

    console.log(`Product ${testProduct.id} (${testProduct.name}):`);
    if (matchingPromotions.length > 0) {
      matchingPromotions.forEach((promo) => {
        console.log(`  ✅ ${promo.name}`);
        promo.rules.forEach((rule) => {
          if (rule.action?.gift_item?.product_id) {
            console.log(`     → Gift: Product ${rule.action.gift_item.product_id}`);
          }
        });
      });
    } else {
      console.log(`  ❌ No promotions found`);
    }
    console.log('');
  }
}

testMultipleProducts().catch(console.error);
