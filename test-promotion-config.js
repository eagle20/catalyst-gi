// Check promotion configuration for auto-add settings
const STORE_HASH = 'wlbjjbyoi5';
const ACCESS_TOKEN = 'e5yn75w1fr4cylbxvz9odm8caeizbd4';

async function checkPromotionConfig() {
  console.log('Checking promotion configuration...\n');

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

  console.log('Full promotion data:\n');
  console.log(JSON.stringify(data, null, 2));
}

checkPromotionConfig().catch(console.error);
