// Find which products have free gift promotions
const PROMOTIONS = [
  { id: 7, name: "FREE BATTERY 48-11-1881", products: [531974, 545027, 610105, 646975, 871862, 871978, 872094, 873502, 873528, 873529], gift: 871944 },
  { id: 8, name: "FREE BATTERY 48-11-1865", products: [673526, 673531, 705418, 871979, 878170], gift: 715813 },
  { id: 9, name: "FREE BATTERY 48-11-2420", products: [563647, 648389, 759613, 871694, 871696, 872143], gift: 697282 },
  { id: 10, name: "COPPER TUBING CUTTER KIT FREE", products: [871825], gift: 632515 },
  { id: 11, name: "FREE BATTERY 48-11-1850", products: [507926, 607757, 705443, 872056, 873505, 873568, 878169], gift: 520340 },
];

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  Products with FREE GIFT Promotions - READY TO TEST         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

PROMOTIONS.forEach(promo => {
  console.log(`✓ ${promo.name}`);
  console.log(`  Gift Product ID: ${promo.gift}`);
  console.log(`  Test URLs:`);
  promo.products.slice(0, 3).forEach(productId => {
    console.log(`    → http://localhost:3000/product/${productId}`);
  });
  if (promo.products.length > 3) {
    console.log(`    ... and ${promo.products.length - 3} more products`);
  }
  console.log('');
});

console.log('═'.repeat(64));
console.log('RECOMMENDED TEST PRODUCTS:');
console.log('═'.repeat(64));
console.log('1. Product 531974  → Gets FREE BATTERY 48-11-1881');
console.log('2. Product 871825  → Gets COPPER TUBING CUTTER KIT');
console.log('3. Product 507926  → MLW 0880-20 (Gets FREE BATTERY 48-11-1850)');
console.log('═'.repeat(64));
