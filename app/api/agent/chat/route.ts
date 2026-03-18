import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BASE = 'https://megachad.xyz';

// Intent patterns — matched in order, first match wins
const INTENTS: {
  patterns: RegExp[];
  handler: (match: RegExpMatchArray, wallet?: string) => Promise<unknown>;
}[] = [
  // ── Price / Cost ─────────────────────────────────────
  {
    patterns: [
      /(?:price|cost|how much|worth|value)/i,
      /(?:burn cost|looksmaxx cost|cost to (?:burn|looksmaxx|mint))/i,
    ],
    handler: async () => {
      const res = await fetch(`${BASE}/api/price`);
      const data = await res.json();
      return {
        intent: 'price',
        answer: `$MEGACHAD is currently ${data.price?.megachadPerEth ? `${Number(data.price.megachadPerEth).toLocaleString()} per ETH` : 'available on Kumbaya DEX'}. A looksmaxx burn costs ~${data.burnCost?.ethEstimate || '???'} ETH (225,000 $MEGACHAD) plus 1 USDm infra fee.`,
        data,
        actions: [
          { label: 'Get swap quote', endpoint: '/api/x402/quote?ethAmount=0.1' },
          { label: 'Check wallet', endpoint: '/api/wallet?address=YOUR_WALLET' },
        ],
      };
    },
  },

  // ── Stats ────────────────────────────────────────────
  {
    patterns: [
      /(?:stats|statistics|supply|burned|burn count|how many|total)/i,
    ],
    handler: async () => {
      const res = await fetch(`${BASE}/api/stats`);
      const data = await res.json();
      return {
        intent: 'stats',
        answer: `$MEGACHAD stats: ${data.totalBurns || 0} total burns, ${data.tokensBurned ? Number(data.tokensBurned).toLocaleString() : '???'} tokens burned, circulating supply: ${data.circulatingSupply ? Number(data.circulatingSupply).toLocaleString() : '???'}.`,
        data,
        actions: [
          { label: 'View gallery', endpoint: '/api/gallery?limit=5' },
          { label: 'View leaderboard', endpoint: '/api/chadboard' },
        ],
      };
    },
  },

  // ── Wallet check ─────────────────────────────────────
  {
    patterns: [
      /(?:check|balance|eligib|wallet|can i burn).*(0x[a-fA-F0-9]{40})/i,
      /(0x[a-fA-F0-9]{40}).*(?:balance|check|eligib|burn)/i,
    ],
    handler: async (match) => {
      const addr = match[1];
      const res = await fetch(`${BASE}/api/wallet?address=${addr}`);
      const data = await res.json();
      return {
        intent: 'wallet',
        answer: `Wallet ${addr.slice(0, 6)}...${addr.slice(-4)}: ${data.megachadBalance || '0'} $MEGACHAD, ${data.ethBalance || '0'} ETH. ${data.burnEligible ? 'Eligible to burn.' : 'Not enough tokens to burn (need 225,000).'}`,
        data,
        actions: [
          { label: 'Get looksmaxx plan', endpoint: `/api/agent/looksmaxx?wallet=${addr}` },
          { label: 'Get gasless burn info', endpoint: `/api/gasless/burn?address=${addr}` },
        ],
      };
    },
  },

  // ── Looksmaxx / Burn plan ────────────────────────────
  {
    patterns: [
      /(?:looksmaxx|burn|mint|plan|create|generate).*(0x[a-fA-F0-9]{40})/i,
      /(0x[a-fA-F0-9]{40}).*(?:looksmaxx|burn|mint|plan)/i,
    ],
    handler: async (match) => {
      const addr = match[1];
      const res = await fetch(`${BASE}/api/agent/looksmaxx?wallet=${addr}`);
      const data = await res.json();
      const stepCount = data.steps?.length || 0;
      return {
        intent: 'looksmaxx_plan',
        answer: `Looksmaxx plan for ${addr.slice(0, 6)}...${addr.slice(-4)}: ${stepCount} steps. ${data.currentState?.hasEnoughTokens ? 'Wallet has enough tokens — swap step will be skipped.' : `Need ${data.currentState?.tokensNeeded?.toLocaleString() || '225,000'} more $MEGACHAD.`}`,
        data,
        actions: [
          { label: 'Get swap quote', endpoint: `/api/x402/quote?ethAmount=0.1` },
          { label: 'Get gasless option', endpoint: `/api/gasless/burn?address=${addr}` },
        ],
      };
    },
  },

  // ── Swap / Buy ───────────────────────────────────────
  {
    patterns: [
      /(?:swap|buy|purchase|get megachad|acquire)/i,
      /(?:how (?:to|do i) (?:buy|get|swap))/i,
    ],
    handler: async () => {
      const res = await fetch(`${BASE}/api/x402/quote`);
      const data = await res.json();
      return {
        intent: 'swap',
        answer: 'Swap ETH for $MEGACHAD on Kumbaya DEX (MegaETH). Provide an ETH amount to get a live quote with pre-built transaction calldata.',
        data,
        actions: [
          { label: 'Quote for 0.01 ETH', endpoint: '/api/x402/quote?ethAmount=0.01' },
          { label: 'Quote for 0.05 ETH', endpoint: '/api/x402/quote?ethAmount=0.05' },
          { label: 'Quote for 0.1 ETH', endpoint: '/api/x402/quote?ethAmount=0.1' },
        ],
      };
    },
  },

  // ── Gallery ──────────────────────────────────────────
  {
    patterns: [
      /(?:gallery|recent|latest|images|nft|portraits|show me)/i,
    ],
    handler: async () => {
      const res = await fetch(`${BASE}/api/gallery?limit=5`);
      const data = await res.json();
      const count = data.burns?.length || 0;
      return {
        intent: 'gallery',
        answer: `Showing ${count} most recent looksmaxxed burns.`,
        data,
        actions: [
          { label: 'More results', endpoint: '/api/gallery?limit=20' },
          { label: 'View leaderboard', endpoint: '/api/chadboard' },
        ],
      };
    },
  },

  // ── Leaderboard ──────────────────────────────────────
  {
    patterns: [
      /(?:leader|leaderboard|chadboard|top|rank|who.*most|biggest burner)/i,
    ],
    handler: async () => {
      const res = await fetch(`${BASE}/api/chadboard`);
      const data = await res.json();
      const top = data.leaderboard?.slice(0, 3) || [];
      const topStr = top
        .map((b: { name?: string; address?: string; burnCount?: number }, i: number) =>
          `${i + 1}. ${b.name || b.address?.slice(0, 8) || '???'} (${b.burnCount || 0} burns)`)
        .join(', ');
      return {
        intent: 'leaderboard',
        answer: `Top burners: ${topStr || 'No burns yet.'}`,
        data,
        actions: [
          { label: 'View gallery', endpoint: '/api/gallery?limit=5' },
          { label: 'Get stats', endpoint: '/api/stats' },
        ],
      };
    },
  },

  // ── Bridge ───────────────────────────────────────────
  {
    patterns: [
      /(?:bridge|cross.?chain|move.*eth|transfer.*megaeth|get.*eth.*mega)/i,
    ],
    handler: async () => {
      const res = await fetch(`${BASE}/api/bridge`);
      const data = await res.json();
      return {
        intent: 'bridge',
        answer: 'Bridge ETH to MegaETH using the MegaETH Bridge (canonical) or Rabbithole (fast bridge). Both support ETH from Ethereum mainnet.',
        data,
        actions: [
          { label: 'Check price after bridging', endpoint: '/api/price' },
        ],
      };
    },
  },

  // ── Gasless ──────────────────────────────────────────
  {
    patterns: [
      /(?:gasless|no gas|without gas|relay|eip.?712|meta.?tx)/i,
    ],
    handler: async () => {
      return {
        intent: 'gasless',
        answer: 'MegaChad supports gasless burns via EIP-712. Approve the relayer contract once, then sign a message to burn without paying gas. The relayer submits the transaction for you.',
        actions: [
          { label: 'Check gasless status', endpoint: '/api/gasless/burn?address=YOUR_WALLET' },
          { label: 'Get looksmaxx plan', endpoint: '/api/agent/looksmaxx?wallet=YOUR_WALLET' },
        ],
      };
    },
  },

  // ── Referral ─────────────────────────────────────────
  {
    patterns: [
      /(?:referral|refer|earn|agent.*register|commission|reward)/i,
    ],
    handler: async () => {
      return {
        intent: 'referral',
        answer: 'Agents can register as referrers and earn 11,250 $MEGACHAD (5% of total burn) for every burn they refer. Register on-chain via the referral contract, then share your referral code.',
        actions: [
          { label: 'Register as agent', method: 'POST', endpoint: '/api/agent/register', body: { wallet: 'YOUR_WALLET' } },
          { label: 'Check referral stats', endpoint: '/api/agent/referrals?address=YOUR_WALLET' },
        ],
      };
    },
  },

  // ── What is MegaChad ─────────────────────────────────
  {
    patterns: [
      /(?:what is|explain|about|tell me|describe|how does)/i,
    ],
    handler: async () => {
      return {
        intent: 'about',
        answer: 'MegaChad is a burn-to-create looksmaxxing engine on MegaETH. Burn 225,000 $MEGACHAD tokens (112,500 burned forever + 112,500 to tren fund) to generate an AI-enhanced portrait and mint it as an NFT. The protocol supports x402 payments, gasless burns, agent referrals, and full MCP integration.',
        actions: [
          { label: 'View stats', endpoint: '/api/stats' },
          { label: 'View price', endpoint: '/api/price' },
          { label: 'View gallery', endpoint: '/api/gallery?limit=5' },
          { label: 'Agent info', endpoint: '/api/agent/info' },
        ],
      };
    },
  },
];

/**
 * POST /api/agent/chat
 *
 * Natural language endpoint for AI agents. Send a plain English message
 * and get back structured, actionable responses.
 *
 * Body: { message: "How much does it cost to looksmaxx?", wallet?: "0x..." }
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

  const input = message.trim();

  // If a wallet is provided but not in the message, inject it
  const enrichedInput = wallet && !input.includes('0x')
    ? `${input} ${wallet}`
    : input;

  // Match intents
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      const match = enrichedInput.match(pattern);
      if (match) {
        try {
          const result = await intent.handler(match, wallet || undefined);
          return NextResponse.json(result, {
            headers: { 'Cache-Control': 'no-cache' },
          });
        } catch (err) {
          console.error('[agent/chat] Handler error:', err);
          return NextResponse.json(
            { intent: 'error', answer: 'Something went wrong processing your request. Try again.' },
            { status: 500 },
          );
        }
      }
    }
  }

  // No match — return help
  return NextResponse.json({
    intent: 'unknown',
    answer: "I didn't understand that. Try asking about: price, stats, wallet balance, looksmaxx, swap, gallery, leaderboard, bridge, gasless burns, or referrals.",
    examples: [
      'What is the current MEGACHAD price?',
      'Check wallet 0x1234...5678',
      'Plan a looksmaxx for 0x1234...5678',
      'Show me the gallery',
      'Who are the top burners?',
      'How do I bridge ETH to MegaETH?',
      'How do referrals work?',
    ],
    actions: [
      { label: 'Get stats', endpoint: '/api/stats' },
      { label: 'Get price', endpoint: '/api/price' },
      { label: 'Agent info', endpoint: '/api/agent/info' },
    ],
  });
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
    description: 'Natural language interface for AI agents. Send plain English and get structured, actionable responses.',
    body: {
      message: { type: 'string', required: true, description: 'Natural language query' },
      wallet: { type: 'string', required: false, description: 'Wallet address for context (0x...)' },
    },
    supportedIntents: [
      'price — Token price and burn cost',
      'stats — Protocol statistics',
      'wallet — Check balances and eligibility',
      'looksmaxx — Get burn-to-create plan with calldata',
      'swap — Swap ETH for $MEGACHAD',
      'gallery — Recent looksmaxxed burns',
      'leaderboard — Top burners',
      'bridge — Cross-chain bridge info',
      'gasless — EIP-712 gasless burn info',
      'referral — Agent referral program',
      'about — What is MegaChad',
    ],
    examples: [
      { message: 'What is the current MEGACHAD price?' },
      { message: 'Check wallet 0xABC...123' },
      { message: 'Looksmaxx for 0xABC...123' },
      { message: 'How do referrals work?' },
    ],
  });
}
