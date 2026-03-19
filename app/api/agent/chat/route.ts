import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, buildExecutionPlan } from '@/lib/intent-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/agent/chat
 *
 * Natural language transaction engine for AI agents and humans.
 * Parses intent via LLM (with regex fallback), resolves on-chain state,
 * and returns structured responses with ready-to-sign calldata.
 *
 * Body: { message: "swap 0.1 ETH for megachad and burn it", wallet?: "0x..." }
 */
export async function POST(req: NextRequest) {
  let body: { message?: string; wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, wallet } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Missing or empty message' }, { status: 400 });
  }

  try {
    // Step 1: Parse intent (LLM-powered with regex fallback)
    const parsed = await parseIntent(message.trim(), wallet || undefined);

    // Step 2: Build execution plan with calldata
    const result = await buildExecutionPlan(parsed.intent, parsed.params);

    // Enrich with parsing metadata
    return NextResponse.json(
      {
        ...result,
        understanding: parsed.understanding,
        parsedIntent: parsed.intent,
        parsedParams: parsed.params,
      },
      {
        headers: { 'Cache-Control': 'no-cache' },
      },
    );
  } catch (err) {
    console.error('[agent/chat] Error:', err);
    return NextResponse.json(
      {
        intent: 'error',
        answer: 'Something went wrong processing your request. Try again.',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/agent/chat
 *
 * Returns endpoint documentation.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agent/chat',
    method: 'POST',
    description: 'Natural language transaction engine. Send plain English and get structured responses with ready-to-sign calldata.',
    version: '2.0.0',
    features: [
      'LLM-powered intent parsing (Claude Haiku) with regex fallback',
      'On-chain state resolution (balances, approvals, burn eligibility)',
      'Pre-built transaction calldata (swap, approve, burn, register)',
      'Cross-chain intent planning (bridge + swap + burn from any chain)',
      'Multi-burn and scheduled burn support',
      'Wallet comparison',
      'Identity-aware responses (MegaNames, reputation, tier)',
    ],
    body: {
      message: { type: 'string', required: true, description: 'Natural language query or command' },
      wallet: { type: 'string', required: false, description: 'Wallet address for context (0x...)' },
    },
    supportedIntents: [
      'looksmaxx — Full flow: swap (if needed) + burn + generate + mint, with calldata',
      'cross_chain_looksmaxx — Looksmaxx from any chain: bridge + swap + burn',
      'swap — Swap ETH for $MEGACHAD with Kumbaya calldata',
      'burn — Burn $MEGACHAD with transaction calldata',
      'bridge — Bridge assets to MegaETH from any supported chain',
      'price — Current token price and burn cost',
      'stats — Protocol statistics (burns, supply)',
      'wallet — Check balances, eligibility, and identity',
      'gallery — Recent looksmaxxed burns',
      'leaderboard — Top burners ranked',
      'referral — Referral program info + agent registration calldata',
      'register_agent — Register as referral agent with calldata',
      'gasless — EIP-712 gasless burn info',
      'compare — Compare two wallets side by side',
      'multi_burn — Plan multiple sequential burns',
      'schedule — Scheduled/recurring burn info',
      'about — What is MegaChad',
    ],
    examples: [
      { message: 'looksmaxx 0xABC...123', description: 'Full looksmaxx plan with calldata' },
      { message: 'swap 0.1 ETH for megachad', description: 'Swap calldata' },
      { message: 'I have ETH on Base, looksmaxx me', description: 'Cross-chain intent' },
      { message: 'compare 0xABC vs 0xDEF', description: 'Side-by-side comparison' },
      { message: 'burn 3 times for 0xABC', description: 'Multi-burn plan' },
      { message: 'register me as an agent', description: 'Agent registration calldata' },
      { message: 'set up weekly burns', description: 'Scheduled burn info' },
    ],
    responseFormat: {
      intent: 'The resolved intent type',
      understanding: 'What the engine understood',
      answer: 'Human-readable response',
      actions: 'Array of executable actions with calldata',
      state: 'Current on-chain state (balances, approvals)',
      executionPlan: 'Ordered list of steps to execute',
    },
  });
}
