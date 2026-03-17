import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAnalytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics
 *
 * Returns aggregated analytics: total API calls, unique callers, per-endpoint breakdown, MCP tool usage.
 * Optionally accepts ?date=YYYY-MM-DD for historical data (defaults to today).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date') || undefined;

    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    const data = await getAnalytics(date);

    // Sort endpoints by call count descending
    const sortedEndpoints = Object.entries(data.endpoints)
      .sort(([, a], [, b]) => b - a)
      .reduce<Record<string, number>>((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});

    const sortedMcpTools = Object.entries(data.mcpTools)
      .sort(([, a], [, b]) => b - a)
      .reduce<Record<string, number>>((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});

    return NextResponse.json(
      {
        date: data.date,
        totalApiCalls: data.totalApiCalls,
        uniqueCallers: data.uniqueCallers,
        endpoints: sortedEndpoints,
        mcpTools: sortedMcpTools,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=10, s-maxage=10',
        },
      },
    );
  } catch (err) {
    console.error('[analytics] Failed to fetch analytics:', err);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 },
    );
  }
}
