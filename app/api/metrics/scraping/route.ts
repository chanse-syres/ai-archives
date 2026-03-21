import { NextResponse } from 'next/server';
import { scrapeMetricsStore } from '@/lib/metrics';

const ALLOWED_ORIGIN = '*';

/**
 * GET /api/metrics/scraping
 *
 * Returns in-memory percentile snapshots for the scraping pipeline.
 */
export async function GET() {
  return NextResponse.json(
    {
      scrapeMetrics: scrapeMetricsStore.snapshot(),
    },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      },
    }
  );
}