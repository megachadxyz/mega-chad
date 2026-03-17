import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/events
 *
 * Server-Sent Events (SSE) endpoint streaming recent burns and stats updates.
 * Agents can subscribe to this for real-time protocol activity.
 *
 * Events:
 * - stats: token supply and burn count (every 30s)
 * - burn: new burn detected (polled from Redis every 10s)
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastBurnCount = -1;
      let tick = 0;

      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const fetchStats = async () => {
        try {
          const res = await fetch('https://megachad.xyz/api/stats', { cache: 'no-store' });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const fetchGallery = async () => {
        try {
          const res = await fetch('https://megachad.xyz/api/gallery?limit=5', { cache: 'no-store' });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      // Send initial connection event
      send('connected', {
        message: 'Connected to MegaChad event stream',
        events: ['stats', 'burn', 'heartbeat'],
        timestamp: new Date().toISOString(),
      });

      // Send initial stats
      const initialStats = await fetchStats();
      if (initialStats) {
        send('stats', initialStats);
        lastBurnCount = initialStats.totalBurns || 0;
      }

      // Poll loop
      const interval = setInterval(async () => {
        tick++;

        // Heartbeat every 15s
        if (tick % 3 === 0) {
          send('heartbeat', { timestamp: new Date().toISOString() });
        }

        // Stats every 30s
        if (tick % 6 === 0) {
          const stats = await fetchStats();
          if (stats) {
            send('stats', stats);

            // Check for new burns
            if (lastBurnCount >= 0 && stats.totalBurns > lastBurnCount) {
              const gallery = await fetchGallery();
              if (gallery?.burns?.length) {
                for (const burn of gallery.burns.slice(0, stats.totalBurns - lastBurnCount)) {
                  send('burn', burn);
                }
              }
            }
            lastBurnCount = stats.totalBurns || lastBurnCount;
          }
        }
      }, 5_000);

      // Cleanup after maxDuration
      setTimeout(() => {
        clearInterval(interval);
        send('close', { reason: 'Max duration reached, reconnect to continue' });
        controller.close();
      }, 55_000); // 55s to stay under 60s maxDuration
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
