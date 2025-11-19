import { NextRequest, NextResponse } from 'next/server';

import { getORSPriceAndAvailability } from '~/client/ors-nasco';

/**
 * GET /api/ors-availability
 * Fetches ORS Nasco pricing and availability for given product IDs
 *
 * Query params:
 * - orsProductIds: Comma-separated list of ORS product IDs (e.g., "312-7,680-11-921A")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orsProductIdsParam = searchParams.get('orsProductIds');

    if (!orsProductIdsParam) {
      return NextResponse.json(
        { error: 'Missing orsProductIds parameter' },
        { status: 400 },
      );
    }

    // Split comma-separated IDs and trim whitespace
    const orsProductIds = orsProductIdsParam.split(',').map((id) => id.trim()).filter(Boolean);

    if (orsProductIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid ORS product IDs provided' },
        { status: 400 },
      );
    }

    const data = await getORSPriceAndAvailability(orsProductIds);

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch ORS data' },
        { status: 500 },
      );
    }

    return NextResponse.json({ products: data });
  } catch (error) {
    console.error('❌ [ORS Availability API] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
