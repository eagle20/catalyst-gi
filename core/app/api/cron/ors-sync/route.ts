import { NextRequest, NextResponse } from 'next/server';

import { runOrsSync } from '~/lib/ors/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/ors-sync — called by Vercel Cron (see vercel.json).
 * Requires `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends automatically.
 * Add `?dryRun=1` to see the changes without writing them.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  try {
    const result = await runOrsSync({ dryRun });

    // eslint-disable-next-line no-console
    console.log(
      `[ors-sync] ${dryRun ? 'dry run' : 'applied'}: ${result.changed.length} changed, ` +
        `${result.unchanged.length} unchanged, ${result.skipped.length} skipped of ${result.enrolled}`,
    );

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[ors-sync] failed, nothing written:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ORS sync failed' },
      { status: 500 },
    );
  }
}
