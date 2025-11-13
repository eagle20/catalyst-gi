# TypeScript Errors - Post Merge

## Summary
After merging `feature/product-reviews-and-improvements` into `main`, there are **41 total TypeScript errors**:
- **14 pre-existing errors** (from origin/main at fe028ea5)
- **27 new errors** (introduced by promotion feature)

---

## Pre-existing Errors (14) - From origin/main

### SectionLayout Missing Padding Props (5 errors)
All VIBES Soul sections are missing required padding properties:
- `paddingOptionsLargeDesktop`
- `paddingOptionsDesktop`
- `paddingOptionsTablet`
- `paddingOptionsMobile`

**Affected files:**
- `vibes/soul/sections/cart/index.tsx:153`
- `vibes/soul/sections/dynamic-form-section/index.tsx:25`
- `vibes/soul/sections/featured-blog-post-list/index.tsx:30`
- `vibes/soul/sections/featured-product-carousel/index.tsx:54`
- `vibes/soul/sections/maintenance/index.tsx:32`

### Product Type Issues (5 errors)
- `data-transformers/wishlists-transformer.ts:38,42,46` - `product` is possibly null
- `data-transformers/wishlists-transformer.ts:68` - Type mismatch in product assignment

### Compare Card Type Issues (4 errors)
- `vibes/soul/primitives/compare-card/index.tsx:10` - `CompareCardWithId` interface extends `Product` incorrectly (description type mismatch)
- `vibes/soul/primitives/compare-card/index.tsx:73` - Type assignment error
- `vibes/soul/primitives/compare-card/index.tsx:94,95` - Missing `rating` property

---

## New Errors from Promotion Feature (27)

### 1. SectionLayout Padding Props (12 errors)
Your modified pages need padding props added to `<SectionLayout>`:

**Affected files:**
- `app/[locale]/(default)/product/[slug]/page.tsx:326` - Product detail page
- `app/[locale]/(default)/wishlist/[token]/page.tsx:130` - Wishlist page
- `vibes/soul/sections/account-layout/index.tsx:59` - Account layout
- `vibes/soul/sections/blog-post-content/index.tsx:35` - Blog post content
- `vibes/soul/sections/blog-post-list/index.tsx:46` - Blog post list
- `vibes/soul/sections/not-found/index.tsx:24` - Not found page
- `vibes/soul/sections/product-detail/index.tsx:321` - Product detail section
- And 5 more...

### 2. Product Type - Missing Fields (8 errors)
Your code adds `categories` and `plainTextDescription` fields that aren't in the base Product type:

**Affected files:**
- `app/[locale]/(default)/(faceted)/search/page.tsx:266,267` - Search page getCompareProducts
- `app/[locale]/(default)/(faceted)/brand/[slug]/page.tsx` - Brand page
- `app/[locale]/(default)/(faceted)/category/[slug]/page.tsx` - Category page
- `app/[locale]/(default)/compare/page.tsx:38` - Compare page
- `vibes/soul/sections/products-list-section/index.tsx:316` - Products list section

**Issue:** The `Product` interface needs to be extended to include:
```typescript
description: string;
categories: string[];
```

### 3. Promotion Schema Type Conflicts (4 errors)
`vibes/soul/sections/product-detail/schema.ts:119-122`

Your promotion fields aren't compatible with the schema index signature:
```typescript
freeToolProductId?: z.ZodOptional<z.ZodNumber>;
freeToolVariantId?: z.ZodOptional<z.ZodNumber>;
freeToolQuantity?: z.ZodOptional<z.ZodNumber>;
promoCode?: z.ZodOptional<z.ZodString>;
```

**Fix needed:** Update the `SchemaRawShape` interface to allow these types.

### 4. Form Submission Type Mismatches (3 errors)
`vibes/soul/sections/product-detail/product-detail-form.tsx:121-123,142,354`

**Issues:**
- Line 121-123: `lastResult` and `successMessage` properties don't exist on `void` return type
- Line 142: Form submission type signature mismatch
- Line 354: `number | undefined` cannot be assigned to `string`

### 5. GraphQL Query Errors (2 errors)
`client/queries/get-gift-products.ts:79,81`

**Issues:**
- `data.site.products.edges` is possibly null
- `product.variants.edges` is possibly null

**Fix needed:** Add null checks before accessing.

### 6. Product Promotions API (2 errors)
`client/management/get-product-promotions.ts:67,106,107`

**Issues:**
- Object is possibly undefined
- `data` property doesn't exist on empty object type

### 7. Add to Cart Action (1 error)
`app/[locale]/(default)/product/[slug]/_actions/add-to-cart.tsx:222`

**Issue:** Type `{}` is not assignable to type `string`

### 8. Various Data Property Errors (6 errors)
Multiple pages have `Property 'data' does not exist on type '{}'` errors:
- `app/[locale]/(default)/(faceted)/brand/[slug]/page.tsx:152,159`
- `app/[locale]/(default)/(faceted)/category/[slug]/page.tsx:167,174`
- `app/[locale]/(default)/(faceted)/search/page.tsx:132,139`
- `app/[locale]/(default)/product/[slug]/page.tsx:188,195`

### 9. Product Detail Inventory (1 error)
`app/[locale]/(default)/product/[slug]/page.tsx:344`

**Issue:** Streamable type mismatch for inventory value

### 10. Products List Section (1 error)
`vibes/soul/sections/products-list-section/index.tsx:316`

**Issue:** Missing `categoryImage` property

---

## Runtime Errors (Non-TypeScript)

### GraphQL Query - Unknown Argument 'width'
`client/queries/get-gift-products.ts` - The GraphQL query uses `width` argument on `urlTemplate` field which is not supported by the API.

**Error:**
```
Unknown argument 'width' on field 'urlTemplate' of type 'Image'
```

**Fix needed:** Remove `width` parameter from the query.

---

## Recommended Fix Priority

### High Priority (Blocking Production Build)
1. Fix SectionLayout padding props (add default values)
2. Fix Product type to include `description` and `categories`
3. Fix promotion schema type definitions
4. Fix GraphQL width argument error

### Medium Priority
1. Add null checks for GraphQL responses
2. Fix form submission type signatures
3. Fix data property access errors

### Low Priority
1. Fix wishlist transformer null checks (pre-existing)
2. Fix compare card interface issues (pre-existing)

---

## Notes
- Dev server runs successfully with these errors
- All errors are TypeScript compile-time issues
- Runtime functionality appears to work despite type errors
- Consider incremental fixes in separate PR
