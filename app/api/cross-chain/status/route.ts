import { NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_CHAINS } from '@/lib/cross-chain';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cross-chain/status
 *
 * Check the status of a cross-chain intent.
 * Query: ?id=cc_... or ?wallet=0x...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const intentId = searchParams.get('id');
  const wallet = searchParams.get('wallet');

  if (!intentId && !wallet) {
    return NextResponse.json({
      description: 'Cross-chain intent status tracker',
      usage: 'GET /api/cross-chain/status?id=cc_... or ?wallet=0x...',
      supportedChains: Object.keys(SUPPORTED_CHAINS),
    });
  }

  // In production this would query Redis for stored intent state.
  // For now, return a status template that agents can use.
  return NextResponse.json({
    intentId: intentId || null,
    wallet: wallet || null,
    status: 'pending',
    message: 'Cross-chain intent tracking is available. Submit intents via POST /api/cross-chain/intent and track them here.',
    checkpoints: {
      bridged: 'Check MegaETH balance to confirm bridge completion',
      swapped: 'Check $MEGACHAD balance to confirm swap',
      burned: 'Check burn transaction on megaexplorer.xyz',
      minted: 'Check NFT ownership via /api/wallet?address=...',
    },
    verificationEndpoints: {
      balance: `/api/wallet${wallet ? `?address=${wallet}` : ''}`,
      burns: `/api/chadboard`,
      gallery: `/api/gallery?limit=5`,
    },
  });
}
