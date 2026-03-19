import { NextRequest, NextResponse } from 'next/server';
import {
  SUPPORTED_CHAINS,
  getChainByName,
  getChainById,
  buildCrossChainPlan,
} from '@/lib/cross-chain';
import { BURN_AMOUNT_DISPLAY } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cross-chain/intent
 *
 * Build a cross-chain looksmaxx plan from any supported chain.
 * Returns step-by-step instructions with bridge URLs, swap calldata,
 * and burn calldata — ready for agent or frontend execution.
 *
 * Query: ?sourceChain=base&wallet=0x...&amount=0.15&referrer=0x...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chainParam = searchParams.get('sourceChain') || searchParams.get('chain');
  const chainIdParam = searchParams.get('chainId');
  const wallet = searchParams.get('wallet');
  const amount = searchParams.get('amount');
  const referrer = searchParams.get('referrer');

  // If no chain specified, return supported chains
  if (!chainParam && !chainIdParam) {
    return NextResponse.json({
      description: 'Cross-chain looksmaxx intent builder. Specify a source chain to get a full execution plan.',
      usage: 'GET /api/cross-chain/intent?sourceChain=base&wallet=0x...&amount=0.15',
      supportedChains: Object.values(SUPPORTED_CHAINS).map(c => ({
        name: c.name,
        displayName: c.displayName,
        chainId: c.id,
        nativeCurrency: c.nativeCurrency,
        bridgeSupport: c.bridgeSupport,
        estimatedTime: c.estimatedBridgeTime,
        assets: c.assets,
      })),
      megaethChainId: 4326,
      burnCost: `${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD`,
      infraFee: '1 USDm',
    });
  }

  // Resolve chain
  const chain = chainParam
    ? getChainByName(chainParam)
    : chainIdParam
      ? getChainById(parseInt(chainIdParam))
      : null;

  if (!chain) {
    return NextResponse.json(
      {
        error: `Unsupported chain: ${chainParam || chainIdParam}`,
        supportedChains: Object.keys(SUPPORTED_CHAINS),
      },
      { status: 400 },
    );
  }

  // Build the cross-chain plan
  const plan = buildCrossChainPlan(
    chain,
    wallet || undefined,
    amount || undefined,
    referrer || undefined,
  );

  // Fetch price estimate if we can
  let priceEstimate = null;
  try {
    const priceRes = await fetch('https://megachad.xyz/api/price');
    const priceData = await priceRes.json();
    priceEstimate = {
      ethPerBurn: priceData.burnCost?.ethEstimate || null,
      megachadPerEth: priceData.price?.megachadPerEth || null,
    };
  } catch {
    // Non-critical
  }

  return NextResponse.json({
    intent: plan,
    priceEstimate,
    summary: {
      from: chain.displayName,
      to: 'MegaETH',
      steps: plan.steps.length,
      estimatedTime: chain.estimatedBridgeTime,
      burnCost: `${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD`,
      infraFee: '1 USDm',
      ethNeeded: priceEstimate?.ethPerBurn || 'check /api/price',
    },
    agentInstructions: {
      description: 'To execute this cross-chain looksmaxx, process steps in order:',
      steps: plan.steps.map(s => ({
        step: s.step,
        action: s.type,
        label: s.label,
        chain: s.chainId === 4326 ? 'MegaETH' : chain.displayName,
        instruction: s.description,
        ...(s.externalUrl ? { bridgeUrl: s.externalUrl } : {}),
        ...(s.tx ? { calldata: s.tx } : {}),
      })),
      notes: [
        'Wait for bridge confirmation before proceeding to swap step',
        'Swap and burn calldata available via /api/agent/chat with wallet address',
        'After burn confirms, POST image to /api/generate or /api/x402/looksmaxx',
        wallet ? `Wallet: ${wallet}` : 'Provide wallet address for pre-built calldata',
      ],
    },
  });
}

/**
 * POST /api/cross-chain/intent
 *
 * Submit a cross-chain intent for tracking.
 * Used by agents to register their intent and track progress.
 */
export async function POST(req: NextRequest) {
  let body: {
    sourceChain?: string;
    chainId?: number;
    wallet?: string;
    amount?: string;
    referrer?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const chain = body.sourceChain
    ? getChainByName(body.sourceChain)
    : body.chainId
      ? getChainById(body.chainId)
      : null;

  if (!chain) {
    return NextResponse.json(
      { error: 'Invalid or unsupported source chain', supportedChains: Object.keys(SUPPORTED_CHAINS) },
      { status: 400 },
    );
  }

  const plan = buildCrossChainPlan(
    chain,
    body.wallet || undefined,
    body.amount || undefined,
    body.referrer || undefined,
  );

  // In production, store intent in Redis for status tracking
  // For now, return the plan with an ID for reference

  return NextResponse.json({
    intentId: plan.id,
    intent: plan,
    message: `Cross-chain looksmaxx intent created. ${plan.steps.length} steps from ${chain.displayName} to MegaETH.`,
    statusEndpoint: `/api/cross-chain/status?id=${plan.id}`,
  });
}
