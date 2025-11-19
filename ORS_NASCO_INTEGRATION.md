# ORS Nasco Wholesaler Integration

This document describes the ORS Nasco wholesaler integration for displaying real-time pricing and availability on product pages.

## Overview

The integration fetches pricing and availability data from the ORS Nasco API and displays it on product detail pages for products that have an ORS Product ID configured.

## Features

- ✅ Real-time pricing from ORS Nasco wholesaler
- ✅ Total availability across all warehouses
- ✅ OAuth 2.0 authentication with token caching
- ✅ Automatic display on product pages when ORS Product ID is configured
- ✅ Graceful error handling
- ✅ Ready for future dropshipping integration

## Setup Instructions

### 1. Get ORS Nasco API Credentials

Contact ORS Nasco to obtain:
- Client ID
- Client Secret

These credentials are required for OAuth 2.0 authentication.

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# ORS Nasco Wholesaler API Configuration
ORS_NASCO_CLIENT_ID=your_client_id_here
ORS_NASCO_CLIENT_SECRET=your_client_secret_here
```

Optional overrides:
```bash
# Token URL (default: https://apim.workato.com/oauth2/token)
ORS_NASCO_TOKEN_URL=https://apim.workato.com/oauth2/token

# Switch to production endpoints (default uses TEST endpoints)
ORS_NASCO_API_URL=https://apim.workato.com/orsnasco/priceavailability/summary
ORS_NASCO_WAREHOUSE_API_URL=https://apim.workato.com/orsnasco/priceavailability/warehouse
```

**Note:** The integration uses **TEST** endpoints by default (`orsnascotest`). When ready for production, uncomment and set the production URLs above.

### 3. Configure BigCommerce Products

For each product you want to display ORS pricing/availability:

1. Go to BigCommerce Admin → Products → [Product]
2. Scroll to "Custom Fields"
3. Add a new custom field:
   - **Field Name**: `ORS Product ID` (or any name containing "ors" and "product" or "id")
   - **Field Value**: The ORS Nasco product code (e.g., `312-7`, `680-11-921A`)
4. Save the product

The integration will automatically detect this custom field and fetch ORS data for the product.

### 4. Restart Your Development Server

After adding environment variables, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

### Architecture

```
Product Page
    ↓
[getORSProductId()] → Extracts ORS Product ID from custom fields
    ↓
[ORSAvailability Component] → Client-side component
    ↓
API Route: /api/ors-availability
    ↓
[ORS API Client] → Handles OAuth + API calls
    ↓
ORS Nasco API → Returns pricing & availability
```

### Files Created

1. **`core/client/ors-nasco/index.ts`**
   - OAuth 2.0 client with token caching
   - Functions: `getORSPriceAndAvailability()`, `getORSWarehouseAvailability()`
   - Zod schema validation for API responses

2. **`core/app/api/ors-availability/route.ts`**
   - API endpoint for fetching ORS data
   - Query param: `orsProductIds` (comma-separated)
   - Returns: `{ products: [...] }`

3. **`core/app/[locale]/(default)/product/[slug]/_components/ors-availability.tsx`**
   - Client component for displaying ORS data
   - Shows wholesale price, availability, unit of measure
   - Loading states and error handling

4. **`core/app/[locale]/(default)/product/[slug]/page.tsx`** (modified)
   - Added `getORSProductId()` function
   - Integrated `<ORSAvailability>` component
   - Uses Streamable for progressive rendering

## API Response Format

### Summary Endpoint (Currently Used)

**Request:**
```json
{
  "products": [
    {"orsProduct": "312-7"}
  ]
}
```

**Response:**
```json
{
  "products": [
    {
      "orsProduct": "312-7",
      "price": 0.633,
      "uom": "EA",
      "totalAvailability": 12534
    }
  ]
}
```

### Warehouse Endpoint (For Future Dropshipping)

**Response:**
```json
{
  "products": [
    {
      "orsProduct": "312-7",
      "price": 0.633,
      "uom": "EA",
      "warehouseAvailability": 1866,
      "warehouseLocation": "BIRM"
    }
  ]
}
```

## Testing

### 1. Test Product Setup

1. Create or edit a test product in BigCommerce
2. Add custom field: `ORS Product ID` = `312-7`
3. Visit the product page on your storefront
4. You should see a blue box with "Wholesaler Information"

### 2. Test API Endpoint Directly

```bash
curl "http://localhost:3000/api/ors-availability?orsProductIds=312-7,680-11-921A"
```

Expected response:
```json
{
  "products": [
    {
      "orsProduct": "312-7",
      "price": 0.633,
      "uom": "EA",
      "totalAvailability": 12534
    },
    {
      "orsProduct": "680-11-921A",
      "price": 12.64,
      "uom": "PK",
      "totalAvailability": 1843
    }
  ]
}
```

### 3. Check Environment Variables

Make sure your credentials are set:
```bash
# In your terminal
echo $ORS_NASCO_CLIENT_ID
echo $ORS_NASCO_CLIENT_SECRET
```

## Troubleshooting

### "Missing orsProductIds parameter" Error

- The product doesn't have a custom field with "ors" and "product" or "id" in the name
- Check the custom field name in BigCommerce

### "Failed to get OAuth token" Error

- Check that `ORS_NASCO_CLIENT_ID` and `ORS_NASCO_CLIENT_SECRET` are set correctly
- Verify credentials with ORS Nasco
- Check the token URL is correct (default: `https://apim.workato.com/oauth2/token`)

### "Failed to fetch ORS data" Error

- Check your internet connection
- Verify the API URL is correct
- Check ORS Nasco API status
- Look at server console for detailed error messages

### No Wholesaler Information Displayed

- Verify the product has an ORS Product ID custom field
- Check browser console for errors
- Check server console for API errors
- Verify environment variables are loaded

## Future Enhancements

### Phase 2: Dropshipping Integration

1. Use `getORSWarehouseAvailability()` to get warehouse-specific data
2. Create order placement API integration
3. Add warehouse selection logic (closest to customer)
4. Implement order tracking

### Suggested Implementation:
```typescript
// core/app/api/ors-order/route.ts
export async function POST(request: NextRequest) {
  // 1. Validate order data
  // 2. Select optimal warehouse based on customer location
  // 3. Create order via ORS API
  // 4. Return order confirmation
}
```

## Security Considerations

- ✅ OAuth credentials stored in environment variables (never committed to git)
- ✅ OAuth tokens cached in memory (expires automatically)
- ✅ API routes protected by Next.js server-side rendering
- ✅ Zod schema validation prevents malformed data
- ⚠️ Consider rate limiting the `/api/ors-availability` endpoint in production
- ⚠️ Consider caching ORS API responses to reduce API calls

## Support

For issues with:
- **ORS Nasco API**: Contact ORS Nasco support
- **BigCommerce Integration**: Check BigCommerce developer docs
- **Code Issues**: Check application logs and error messages
