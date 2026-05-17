// Natural Language Transaction Engine
// Parses user intent via LLM, resolves state, builds calldata

import { encodeFunctionData, parseEther, formatEther, formatUnits } from 'viem';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI, BURN_AMOUNT, BURN_AMOUNT_DISPLAY, BURN_ADDRESS, TREN_FUND_WALLET } from './contracts';
import { KUMBAYA_SWAP_ROUTER, SWAP_ROUTER_ABI, WETH, DEFAULT_FEE } from './kumbaya';
import { REFERRAL_ADDRESS, REFERRAL_ABI } from './referral';

const BASE = 'https://megachad.xyz';
const MEGAETH_RPC = 'https://mainnet.megaeth.com/rpc';

// ── Action Types ───────────────────────────────────────────────

export interface Action {
  type: 'swap' | 'approve' | 'burn' | 'bridge' | 'looksmaxx' | 'query' | 'register_agent' | 'cross_chain';
  label: string;
  description: string;
  chainId?: number;
  tx?: {
    to: string;
    data?: string;
    value?: string;
  };
  apiCall?: {
    method: string;
    endpoint: string;
    body?: Record<string, unknown>;
  };
  result?: unknown;
}

export interface IntentResult {
  intent: string;
  understanding: string;
  answer: string;
  actions: Action[];
  state?: {
    wallet?: string;
    megachadBalance?: string;
    ethBalance?: string;
    hasEnoughTokens?: boolean;
    hasApproval?: boolean;
    currentChain?: string;
    needsBridge?: boolean;
    needsSwap?: boolean;
  };
  executionPlan?: string[];
}

// ── State Resolver ─────────────────────────────────────────────

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(MEGAETH_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

export async function resolveWalletState(wallet: string): Promise<{
  ethBalance: string;
  megachadBalance: string;
  hasEnoughTokens: boolean;
  burnApproval: string;
}> {
  const balanceOfData = encodeFunctionData({
    abi: MEGACHAD_ABI,
    functionName: 'balanceOf',
    args: [wallet as `0x${string}`],
  });

  const allowanceData = encodeFunctionData({
    abi: MEGACHAD_ABI,
    functionName: 'allowance',
    args: [wallet as `0x${string}`, REFERRAL_ADDRESS],
  });

  const [ethBalRaw, tokenBalRaw, allowanceRaw] = await Promise.all([
    rpcCall('eth_getBalance', [wallet, 'latest']),
    rpcCall('eth_call', [{ to: MEGACHAD_ADDRESS, data: balanceOfData }, 'latest']),
    rpcCall('eth_call', [{ to: MEGACHAD_ADDRESS, data: allowanceData }, 'latest']),
  ]);

  const ethBalance = formatEther(BigInt(ethBalRaw as string));
  const megachadBalance = formatUnits(BigInt(tokenBalRaw as string), 18);
  const burnApproval = formatUnits(BigInt(allowanceRaw as string), 18);
  const hasEnoughTokens = BigInt(tokenBalRaw as string) >= BURN_AMOUNT;

  return { ethBalance, megachadBalance, hasEnoughTokens, burnApproval };
}

// ── Calldata Builders ──────────────────────────────────────────

export function buildSwapCalldata(recipient: string, ethAmount: string): Action {
  const data = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [{
      tokenIn: WETH,
      tokenOut: MEGACHAD_ADDRESS,
      fee: DEFAULT_FEE,
      recipient: recipient as `0x${string}`,
      amountIn: parseEther(ethAmount),
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    }],
  });

  return {
    type: 'swap',
    label: `Swap ${ethAmount} ETH for $MEGACHAD`,
    description: `Swap ${ethAmount} ETH for $MEGACHAD on Kumbaya DEX`,
    chainId: 4326,
    tx: {
      to: KUMBAYA_SWAP_ROUTER,
      data,
      value: parseEther(ethAmount).toString(),
    },
  };
}

export function buildApproveCalldata(spender: string, amount: bigint): Action {
  const data = encodeFunctionData({
    abi: MEGACHAD_ABI,
    functionName: 'approve',
    args: [spender as `0x${string}`, amount],
  });

  return {
    type: 'approve',
    label: `Approve ${formatUnits(amount, 18)} $MEGACHAD`,
    description: `Approve ${spender.slice(0, 8)}... to spend $MEGACHAD`,
    chainId: 4326,
    tx: { to: MEGACHAD_ADDRESS, data },
  };
}

export function buildBurnCalldata(wallet: string, referrer?: string): Action {
  if (referrer) {
    const data = encodeFunctionData({
      abi: REFERRAL_ABI,
      functionName: 'burnWithReferral',
      args: [referrer as `0x${string}`],
    });
    return {
      type: 'burn',
      label: `Burn ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD (with referral)`,
      description: `Burn via referral contract — 50% burned, 45% tren fund, 5% referrer`,
      chainId: 4326,
      tx: { to: REFERRAL_ADDRESS, data },
    };
  }

  // Direct two-transfer burn
  const burnData = encodeFunctionData({
    abi: MEGACHAD_ABI,
    functionName: 'transfer',
    args: [BURN_ADDRESS, BURN_AMOUNT / 2n],
  });
  const trenData = encodeFunctionData({
    abi: MEGACHAD_ABI,
    functionName: 'transfer',
    args: [TREN_FUND_WALLET, BURN_AMOUNT / 2n],
  });

  return {
    type: 'burn',
    label: `Burn ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD`,
    description: `Transfer ${(BURN_AMOUNT_DISPLAY / 2).toLocaleString()} to dead address + ${(BURN_AMOUNT_DISPLAY / 2).toLocaleString()} to tren fund`,
    chainId: 4326,
    tx: { to: MEGACHAD_ADDRESS, data: burnData },
    // Note: second tx handled by execution engine
  };
}

export function buildRegisterAgentCalldata(): Action {
  const data = encodeFunctionData({
    abi: REFERRAL_ABI,
    functionName: 'registerAgent',
    args: [],
  });

  return {
    type: 'register_agent',
    label: 'Register as referral agent',
    description: 'Register on-chain to earn 5% of referred burns',
    chainId: 4326,
    tx: { to: REFERRAL_ADDRESS, data },
  };
}

// ── Intent Parser (LLM-powered) ───────────────────────────────

const SYSTEM_PROMPT = `You are MegaChad's transaction intent parser on MegaETH (chain ID 4326).

Parse user messages into structured intents. You MUST respond with valid JSON only — no markdown, no explanation.

Available intents:
- swap: User wants to swap ETH for $MEGACHAD
- burn: User wants to burn $MEGACHAD for a looksmaxx
- looksmaxx: User wants the full flow (swap if needed + burn + generate + mint)
- bridge: User wants to bridge assets to MegaETH
- cross_chain_looksmaxx: User wants to looksmaxx from another chain (bridge + swap + burn)
- price: Query current price
- stats: Query protocol stats
- wallet: Check wallet balance
- gallery: View recent burns
- leaderboard: View top burners
- referral: Info about referral program
- register_agent: Register as referral agent
- gasless: Info about gasless burns
- about: What is MegaChad
- compare: Compare two wallets/addresses
- multi_burn: Multiple burns in sequence
- schedule: Set up recurring burns
- stake: User wants to stake MEGACHAD (venue=mogger) or MC/MG LP (venue=jester). Requires amount.
- unstake: Withdraw stake. Requires venue + amount.
- claim_rewards: Claim accrued MEGAGOONER. Requires venue (mogger|jester).
- staking_position: Query current staking position / APRs.
- swap_mc_mg: Swap MEGACHAD ↔ MEGAGOONER on the MegaChadLP AMM (NOT the Kumbaya ETH→MC pool). Requires from (MC|MG) + amount.
- add_liquidity: Provide MC + MG liquidity to MegaChadLP. Requires amountMC + amountMG.
- list_proposals: Show recent Jestermogger governance proposals.
- proposal_detail: Show one proposal in detail (proposalId).
- vote: Cast a vote on a proposal. Requires proposalId + support (for|against|abstain).
- queue_proposal: Queue a Succeeded proposal. Requires proposalId.
- execute_proposal: Execute a queued proposal. Requires proposalId.
- emission_schedule: Show MEGAGOONER emission schedule + current week + split.
- protocol_registry: Return the full machine-readable protocol registry (every contract address + ABI hints).
- nft_inventory: Check MEGACHADNFT count + staking-eligibility for a wallet (params.wallet).
- safety: Report CircuitBreaker pause state and NFTVetoCouncil composition (no params).
- activity: Recent on-chain protocol activity feed across all venues (no params).
- propose: Build a Jestermogger propose() tx OR check the caller's top-3 burner eligibility. proposer = params.wallet.
- veto: Build NFTVetoCouncil castVetoVote tx. Requires proposalId + support (yes|no).
- help: General help

Response format:
{
  "intent": "string",
  "params": {
    "wallet": "0x... or null",
    "amount": "ETH amount or null",
    "sourceChain": "ethereum/base/arbitrum/optimism/polygon/bnb/avalanche or null",
    "referrer": "0x... or null",
    "count": "number of burns or null",
    "style": "style preference or null",
    "compareWith": "0x... second address for comparison or null",
    "query": "specific question being asked or null",
    "venue": "mogger|jester or null (for stake/unstake/claim)",
    "from": "MC|MG or null (for swap_mc_mg)",
    "amountMC": "MEGACHAD amount or null (for add_liquidity)",
    "amountMG": "MEGAGOONER amount or null (for add_liquidity)",
    "proposalId": "integer or null (for vote/queue/execute/proposal_detail)",
    "support": "for|against|abstain or null (for vote)"
  },
  "understanding": "one sentence describing what the user wants"
}

Key facts:
- Burn costs 225,000 $MEGACHAD (112,500 burned + 112,500 to tren fund)
- $MEGACHAD is only on MegaETH — users must bridge ETH first, then swap
- Infra fee: 1 USDm per looksmaxx
- Gasless burns available via EIP-712 relayer
- Agents earn 11,250 $MEGACHAD (5%) per referred burn
- Kumbaya DEX for swaps (Uniswap V3 fork)
- Bridges: MegaETH Bridge (canonical) + Rabbithole (multi-chain)`;

export async function parseIntent(message: string, wallet?: string): Promise<{
  intent: string;
  params: Record<string, string | null>;
  understanding: string;
}> {
  // Try Anthropic API first
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: wallet
              ? `User wallet: ${wallet}\nMessage: ${message}`
              : `Message: ${message}`,
          }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch {
      // Fall through to regex fallback
    }
  }

  // Regex fallback (enhanced version of existing logic)
  return regexFallbackParse(message, wallet);
}

function regexFallbackParse(message: string, wallet?: string): {
  intent: string;
  params: Record<string, string | null>;
  understanding: string;
} {
  const msg = message.toLowerCase();
  const addrMatch = message.match(/0x[a-fA-F0-9]{40}/);
  const ethMatch = msg.match(/(\d+\.?\d*)\s*eth/);
  const detectedWallet = addrMatch?.[0] || wallet || null;

  // Cross-chain detection
  const chains = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bnb', 'avalanche', 'mainnet'];
  const detectedChain = chains.find(c => msg.includes(c)) || null;
  const sourceChain = detectedChain === 'mainnet' ? 'ethereum' : detectedChain;

  // Multi-burn detection
  const countMatch = msg.match(/(\d+)\s*(?:times|burns|looksmaxx)/);

  if (sourceChain && /(?:looksmaxx|burn|swap|bridge.*(?:and|then)|from)/.test(msg)) {
    return {
      intent: 'cross_chain_looksmaxx',
      params: { wallet: detectedWallet, amount: ethMatch?.[1] || null, sourceChain, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: `User wants to looksmaxx using assets from ${sourceChain}`,
    };
  }

  if (countMatch && parseInt(countMatch[1]) > 1) {
    return {
      intent: 'multi_burn',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: countMatch[1], style: null, compareWith: null, query: null },
      understanding: `User wants to burn ${countMatch[1]} times`,
    };
  }

  if (/(?:schedule|recurring|weekly|daily|every\s+(?:day|week))/.test(msg)) {
    return {
      intent: 'schedule',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to schedule recurring burns',
    };
  }

  if (/(?:compare|vs|versus|against)/.test(msg)) {
    const addrs = message.match(/0x[a-fA-F0-9]{40}/g);
    return {
      intent: 'compare',
      params: { wallet: addrs?.[0] || wallet || null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: addrs?.[1] || null, query: null },
      understanding: 'User wants to compare wallets',
    };
  }

  if (/(?:register.*agent|become.*agent|sign.*up.*referr)/.test(msg)) {
    return {
      intent: 'register_agent',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to register as a referral agent',
    };
  }

  const numMatch = msg.match(/(\d+(?:\.\d+)?)/);
  const amountStr = numMatch?.[1] || null;
  const proposalIdMatch = msg.match(/proposal\s*#?\s*(\d+)|#(\d+)/);
  const proposalId = proposalIdMatch ? (proposalIdMatch[1] || proposalIdMatch[2]) : null;
  const venueGuess = /jester|lp\b|liquidity\s*pool/.test(msg)
    ? 'jester'
    : /mogger\b|megachad\s*stak/.test(msg)
      ? 'mogger'
      : null;

  if (/(?:paused|pause|circuit\s*breaker|safety|emergency\s*stop|halted|protocol\s*status|is.*(safe|down|broken))/.test(msg)) {
    return {
      intent: 'safety',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants CircuitBreaker + veto-council safety status',
    };
  }

  if (/(?:activity|recent\s*(events?|txs?|burns?|stakes?|action)|what\s*happened|latest\s*on[-\s]?chain)/.test(msg)) {
    return {
      intent: 'activity',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants the recent protocol activity feed',
    };
  }

  if (/(?:nft\s*(?:count|inventory|holdings?|balance)|how\s*many\s*nft|eligible.*(stak|reward)|nft\s*tier|boost\s*tier)/.test(msg)) {
    return {
      intent: 'nft_inventory',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants their NFT inventory + staking eligibility',
    };
  }

  if (/(?:veto|cancel\s*proposal|block\s*proposal)/.test(msg) && proposalId) {
    const vetoSupport = /\b(?:no|against|defend|keep)\b/.test(msg) ? 'no' : 'yes';
    return {
      intent: 'veto',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: vetoSupport, compareWith: null, query: proposalId },
      understanding: `User wants to cast veto-${vetoSupport} on proposal ${proposalId}`,
    };
  }

  if (/(?:create|make|submit|new|draft).*proposal|propose\b|am\s*i\s*eligible.*propos/.test(msg)) {
    return {
      intent: 'propose',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to create a proposal or check proposer eligibility',
    };
  }

  if (/protocol\s*(registry|info|contracts|addresses)|\bregistry\b|all\s*contract/.test(msg)) {
    return {
      intent: 'protocol_registry',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants the full protocol registry',
    };
  }

  if (/(emission|reward\s*schedule|weekly\s*emission|quadratic|225\s*week)/.test(msg)) {
    return {
      intent: 'emission_schedule',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants the MEGAGOONER emission schedule',
    };
  }

  if (/(active\s*proposal|list\s*proposal|governance\s*proposal|all\s*proposal)/.test(msg)) {
    return {
      intent: 'list_proposals',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to list governance proposals',
    };
  }

  if (/(?:vote|cast).*(?:for|against|abstain|yes|no)/.test(msg) && proposalId) {
    const support = /\b(?:for|yes)\b/.test(msg) ? 'for' : /\b(?:against|no)\b/.test(msg) ? 'against' : 'abstain';
    return {
      intent: 'vote',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: support, compareWith: null, query: proposalId },
      understanding: `User wants to vote ${support} on proposal ${proposalId}`,
    };
  }

  if (/queue\s*(?:proposal|#)/.test(msg) && proposalId) {
    return {
      intent: 'queue_proposal',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: proposalId },
      understanding: `User wants to queue proposal ${proposalId}`,
    };
  }
  if (/execute\s*(?:proposal|#)/.test(msg) && proposalId) {
    return {
      intent: 'execute_proposal',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: proposalId },
      understanding: `User wants to execute proposal ${proposalId}`,
    };
  }
  if (/proposal\s*#?\d+/.test(msg) && proposalId) {
    return {
      intent: 'proposal_detail',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: proposalId },
      understanding: `User wants detail for proposal ${proposalId}`,
    };
  }

  if (/add\s*liquidity|provide\s*liquidity|deposit.*lp|seed.*pool/.test(msg)) {
    return {
      intent: 'add_liquidity',
      params: { wallet: detectedWallet, amount: amountStr, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to add MC/MG liquidity',
    };
  }

  // MC↔MG swap on MegaChadLP — must run BEFORE the generic `swap` (which targets ETH→MC).
  if (/(?:swap|trade|exchange|convert).*(?:mc\b|megachad).*(?:to|for|→|->).*(?:mg\b|megagooner)/.test(msg)
    || /(?:swap|trade|exchange|convert).*(?:mg\b|megagooner).*(?:to|for|→|->).*(?:mc\b|megachad)/.test(msg)) {
    const from = /(?:swap|trade|exchange|convert).*megagooner.*(?:to|for|→|->).*megachad/.test(msg)
      || /(?:swap|trade|exchange|convert).*mg\b.*(?:to|for|→|->).*mc\b/.test(msg)
      ? 'MG'
      : 'MC';
    return {
      intent: 'swap_mc_mg',
      params: { wallet: detectedWallet, amount: amountStr, sourceChain: null, referrer: null, count: null, style: from, compareWith: null, query: null },
      understanding: `User wants to swap ${from === 'MC' ? 'MEGACHAD for MEGAGOONER' : 'MEGAGOONER for MEGACHAD'}`,
    };
  }

  if (/(?:stake|deposit)\s+\d/.test(msg) || (/(?:stake|deposit)/.test(msg) && venueGuess)) {
    return {
      intent: 'stake',
      params: { wallet: detectedWallet, amount: amountStr, sourceChain: null, referrer: null, count: null, style: venueGuess || 'mogger', compareWith: null, query: null },
      understanding: `User wants to stake on ${venueGuess || 'mogger'}`,
    };
  }
  if (/(?:unstake|withdraw)\s+\d/.test(msg) || (/(?:unstake|withdraw)/.test(msg) && venueGuess)) {
    return {
      intent: 'unstake',
      params: { wallet: detectedWallet, amount: amountStr, sourceChain: null, referrer: null, count: null, style: venueGuess || 'mogger', compareWith: null, query: null },
      understanding: `User wants to unstake from ${venueGuess || 'mogger'}`,
    };
  }
  if (/(?:claim|harvest).*(?:reward|megagooner|mg\b)/.test(msg)) {
    return {
      intent: 'claim_rewards',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: venueGuess || 'mogger', compareWith: null, query: null },
      understanding: `User wants to claim MEGAGOONER from ${venueGuess || 'mogger'}`,
    };
  }
  if (/(?:my\s*stake|staking\s*position|how\s*much\s*staked|earned\s*megagooner)/.test(msg)) {
    return {
      intent: 'staking_position',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants their staking position',
    };
  }

  if (/(?:looksmaxx|burn.*(?:and|then).*(?:mint|generate|create)|full.*flow)/.test(msg)) {
    return {
      intent: 'looksmaxx',
      params: { wallet: detectedWallet, amount: ethMatch?.[1] || null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to do a full looksmaxx (swap if needed + burn + generate + mint)',
    };
  }

  if (/(?:swap|buy|purchase|get megachad|acquire)/.test(msg)) {
    return {
      intent: 'swap',
      params: { wallet: detectedWallet, amount: ethMatch?.[1] || '0.1', sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: `User wants to swap ${ethMatch?.[1] || 'some'} ETH for $MEGACHAD`,
    };
  }

  if (/(?:burn)/.test(msg) && !/burn.*cost/.test(msg)) {
    return {
      intent: 'burn',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to burn $MEGACHAD',
    };
  }

  if (/(?:bridge|cross.?chain|move.*eth|transfer.*megaeth)/.test(msg)) {
    return {
      intent: 'bridge',
      params: { wallet: detectedWallet, amount: ethMatch?.[1] || null, sourceChain, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to bridge assets to MegaETH',
    };
  }

  if (/(?:price|cost|how much|worth|value)/.test(msg)) {
    return {
      intent: 'price',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to know the current price',
    };
  }

  if (/(?:stats|statistics|supply|total.*burn)/.test(msg)) {
    return {
      intent: 'stats',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants protocol statistics',
    };
  }

  if (/(?:check|balance|eligib|wallet|can i burn)/.test(msg) && detectedWallet) {
    return {
      intent: 'wallet',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to check wallet balance and eligibility',
    };
  }

  if (/(?:gallery|recent|latest|images|nft|portraits|show me)/.test(msg)) {
    return {
      intent: 'gallery',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to see recent looksmaxxes',
    };
  }

  if (/(?:leader|leaderboard|chadboard|top|rank|who.*most|biggest burner)/.test(msg)) {
    return {
      intent: 'leaderboard',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to see the leaderboard',
    };
  }

  if (/(?:referral|refer|earn|commission|reward)/.test(msg)) {
    return {
      intent: 'referral',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants info about the referral program',
    };
  }

  if (/(?:gasless|no gas|without gas|relay|eip.?712|meta.?tx)/.test(msg)) {
    return {
      intent: 'gasless',
      params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants info about gasless burns',
    };
  }

  if (/(?:what is|explain|about|tell me|describe|how does)/.test(msg)) {
    return {
      intent: 'about',
      params: { wallet: null, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: null },
      understanding: 'User wants to know about MegaChad',
    };
  }

  return {
    intent: 'help',
    params: { wallet: detectedWallet, amount: null, sourceChain: null, referrer: null, count: null, style: null, compareWith: null, query: message },
    understanding: 'Could not determine specific intent',
  };
}

// ── Execution Plan Builder ─────────────────────────────────────

export async function buildExecutionPlan(
  intent: string,
  params: Record<string, string | null>,
): Promise<IntentResult> {
  const wallet = params.wallet;

  switch (intent) {
    case 'looksmaxx': {
      if (!wallet) {
        return {
          intent,
          understanding: 'Full looksmaxx flow',
          answer: 'I need your wallet address to build a looksmaxx plan. Provide your 0x address or connect your wallet.',
          actions: [],
        };
      }

      const state = await resolveWalletState(wallet);
      const actions: Action[] = [];
      const plan: string[] = [];

      if (!state.hasEnoughTokens) {
        // Need to swap first
        const priceRes = await fetch(`${BASE}/api/price`).then(r => r.json()).catch(() => null);
        const ethNeeded = priceRes?.burnCost?.ethEstimate || '0.15';
        actions.push(buildSwapCalldata(wallet, ethNeeded));
        plan.push(`Swap ~${ethNeeded} ETH for ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD on Kumbaya DEX`);
      }

      actions.push(buildBurnCalldata(wallet, params.referrer || undefined));
      plan.push(`Burn ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD (50% burned forever, 50% to tren fund)`);
      plan.push('AI generates your looksmaxxed portrait via Replicate');
      plan.push('Image pinned to IPFS via Pinata');
      plan.push('NFT minted to your wallet');

      actions.push({
        type: 'looksmaxx',
        label: 'Generate & Mint',
        description: 'After burn confirms, POST your image to generate the looksmaxx and mint the NFT',
        apiCall: {
          method: 'POST',
          endpoint: '/api/generate',
          body: { wallet },
        },
      });

      return {
        intent,
        understanding: `Full looksmaxx flow for ${wallet.slice(0, 8)}...`,
        answer: state.hasEnoughTokens
          ? `Your wallet has ${Number(state.megachadBalance).toLocaleString()} $MEGACHAD — enough to burn. ${plan.length} steps ready.`
          : `Your wallet needs more $MEGACHAD. Plan includes a swap step. ${plan.length} steps total.`,
        actions,
        state: {
          wallet,
          megachadBalance: state.megachadBalance,
          ethBalance: state.ethBalance,
          hasEnoughTokens: state.hasEnoughTokens,
          needsSwap: !state.hasEnoughTokens,
        },
        executionPlan: plan,
      };
    }

    case 'cross_chain_looksmaxx': {
      const sourceChain = params.sourceChain || 'ethereum';
      const actions: Action[] = [];
      const plan: string[] = [];

      plan.push(`Bridge ETH from ${sourceChain} to MegaETH via Rabbithole`);
      plan.push(`Swap ETH for ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD on Kumbaya DEX`);
      plan.push(`Burn ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD`);
      plan.push('AI generates your looksmaxxed portrait');
      plan.push('Mint NFT on MegaETH');

      actions.push({
        type: 'bridge',
        label: `Bridge from ${sourceChain}`,
        description: `Use Rabbithole to bridge ETH from ${sourceChain} to MegaETH`,
        apiCall: {
          method: 'GET',
          endpoint: '/api/cross-chain/intent',
          body: { sourceChain, wallet: wallet || undefined, amount: params.amount || undefined },
        },
      });

      if (wallet) {
        const ethAmount = params.amount || '0.15';
        actions.push(buildSwapCalldata(wallet, ethAmount));
        actions.push(buildBurnCalldata(wallet, params.referrer || undefined));
      }

      actions.push({
        type: 'looksmaxx',
        label: 'Generate & Mint',
        description: 'After burn confirms, upload image to generate looksmaxx',
        apiCall: { method: 'POST', endpoint: '/api/generate', body: { wallet } },
      });

      return {
        intent,
        understanding: `Cross-chain looksmaxx from ${sourceChain}`,
        answer: `I've built a cross-chain looksmaxx plan from ${sourceChain}. ${plan.length} steps: bridge → swap → burn → generate → mint. ${wallet ? 'Transaction calldata is ready.' : 'Provide your wallet address for pre-built calldata.'}`,
        actions,
        state: {
          wallet: wallet || undefined,
          currentChain: sourceChain,
          needsBridge: true,
          needsSwap: true,
        },
        executionPlan: plan,
      };
    }

    case 'swap': {
      const ethAmount = params.amount || '0.1';
      if (!wallet) {
        return {
          intent,
          understanding: `Swap ${ethAmount} ETH for $MEGACHAD`,
          answer: `To swap ${ethAmount} ETH for $MEGACHAD, I need your wallet address for the recipient. Provide a 0x address.`,
          actions: [{
            type: 'query',
            label: 'Get quote',
            description: `Quote for ${ethAmount} ETH`,
            apiCall: { method: 'GET', endpoint: `/api/x402/quote?ethAmount=${ethAmount}` },
          }],
        };
      }

      const quoteRes = await fetch(`${BASE}/api/x402/quote?ethAmount=${ethAmount}`).then(r => r.json()).catch(() => null);
      const actions = [buildSwapCalldata(wallet, ethAmount)];

      return {
        intent,
        understanding: `Swap ${ethAmount} ETH for $MEGACHAD`,
        answer: quoteRes?.quote
          ? `${ethAmount} ETH ≈ ${Number(quoteRes.quote.amountOut).toLocaleString()} $MEGACHAD. Transaction calldata ready.`
          : `Swap ${ethAmount} ETH for $MEGACHAD on Kumbaya DEX. Calldata ready.`,
        actions,
        state: { wallet },
      };
    }

    case 'burn': {
      if (!wallet) {
        return {
          intent,
          understanding: 'Burn $MEGACHAD',
          answer: 'I need your wallet address to prepare the burn transaction.',
          actions: [],
        };
      }

      const state = await resolveWalletState(wallet);
      if (!state.hasEnoughTokens) {
        return {
          intent,
          understanding: 'Burn $MEGACHAD',
          answer: `Wallet has ${Number(state.megachadBalance).toLocaleString()} $MEGACHAD but needs ${BURN_AMOUNT_DISPLAY.toLocaleString()}. Swap some ETH first.`,
          actions: [buildSwapCalldata(wallet, '0.15')],
          state: { wallet, megachadBalance: state.megachadBalance, ethBalance: state.ethBalance, hasEnoughTokens: false, needsSwap: true },
        };
      }

      return {
        intent,
        understanding: 'Burn $MEGACHAD',
        answer: `Burn transaction ready. ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD will be split: half burned forever, half to tren fund.`,
        actions: [buildBurnCalldata(wallet, params.referrer || undefined)],
        state: { wallet, megachadBalance: state.megachadBalance, ethBalance: state.ethBalance, hasEnoughTokens: true },
      };
    }

    case 'bridge': {
      const sourceChain = params.sourceChain || 'ethereum';
      const bridgeRes = await fetch(`${BASE}/api/bridge`).then(r => r.json()).catch(() => null);

      return {
        intent,
        understanding: `Bridge from ${sourceChain} to MegaETH`,
        answer: `Bridge ETH from ${sourceChain} to MegaETH. Use Rabbithole for multi-chain support or the canonical MegaETH Bridge from Ethereum.`,
        actions: [{
          type: 'bridge',
          label: `Bridge from ${sourceChain}`,
          description: 'Use the cross-chain intent system for automated bridging',
          apiCall: { method: 'GET', endpoint: `/api/cross-chain/intent?sourceChain=${sourceChain}${wallet ? `&wallet=${wallet}` : ''}${params.amount ? `&amount=${params.amount}` : ''}` },
          result: bridgeRes,
        }],
        state: { wallet: wallet || undefined, currentChain: sourceChain, needsBridge: true },
      };
    }

    case 'register_agent': {
      const action = buildRegisterAgentCalldata();
      return {
        intent,
        understanding: 'Register as referral agent',
        answer: wallet
          ? `Registration calldata ready. After registering, you earn 11,250 $MEGACHAD (5%) per referred burn. Share your referral code with other agents.`
          : `To register as an agent, I need your wallet address. After registering, you earn 5% of every referred burn.`,
        actions: wallet ? [action] : [],
      };
    }

    case 'compare': {
      const addr1 = params.wallet;
      const addr2 = params.compareWith;
      if (!addr1 || !addr2) {
        return {
          intent,
          understanding: 'Compare two wallets',
          answer: 'I need two wallet addresses to compare. Example: "compare 0xABC... vs 0xDEF..."',
          actions: [],
        };
      }

      const [wallet1, wallet2, chadboard] = await Promise.all([
        fetch(`${BASE}/api/wallet?address=${addr1}`).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/wallet?address=${addr2}`).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/chadboard`).then(r => r.json()).catch(() => ({ entries: [] })),
      ]);

      const entry1 = chadboard.entries?.find((e: { address: string }) => e.address.toLowerCase() === addr1.toLowerCase());
      const entry2 = chadboard.entries?.find((e: { address: string }) => e.address.toLowerCase() === addr2.toLowerCase());

      return {
        intent,
        understanding: `Compare ${addr1.slice(0, 8)}... vs ${addr2.slice(0, 8)}...`,
        answer: `${entry1?.megaName || addr1.slice(0, 8)}: ${entry1?.totalBurns || 0} burns, ${Number(wallet1.megachadBalance || 0).toLocaleString()} $MEGACHAD\n${entry2?.megaName || addr2.slice(0, 8)}: ${entry2?.totalBurns || 0} burns, ${Number(wallet2.megachadBalance || 0).toLocaleString()} $MEGACHAD`,
        actions: [
          { type: 'query', label: `View ${addr1.slice(0, 8)} profile`, description: 'Full identity profile', apiCall: { method: 'GET', endpoint: `/api/identity/${addr1}` } },
          { type: 'query', label: `View ${addr2.slice(0, 8)} profile`, description: 'Full identity profile', apiCall: { method: 'GET', endpoint: `/api/identity/${addr2}` } },
        ],
      };
    }

    case 'multi_burn': {
      const count = parseInt(params.count || '1');
      const totalTokens = BURN_AMOUNT_DISPLAY * count;
      return {
        intent,
        understanding: `${count} sequential burns`,
        answer: `${count} burns will cost ${totalTokens.toLocaleString()} $MEGACHAD total + ${count} USDm in infra fees. ${wallet ? 'Provide each image separately or use scheduled burns for automation.' : 'Connect your wallet to check balance.'}`,
        actions: wallet ? [
          { type: 'query', label: 'Check balance', description: `Need ${totalTokens.toLocaleString()} $MEGACHAD`, apiCall: { method: 'GET', endpoint: `/api/wallet?address=${wallet}` } },
        ] : [],
        executionPlan: Array.from({ length: count }, (_, i) => `Burn #${i + 1}: ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD → looksmaxx → mint NFT`),
      };
    }

    case 'price': {
      const data = await fetch(`${BASE}/api/price`).then(r => r.json()).catch(() => ({}));
      return {
        intent,
        understanding: 'Current $MEGACHAD price',
        answer: `$MEGACHAD: ${data.price?.megachadPerEth ? `${Number(data.price.megachadPerEth).toLocaleString()} per ETH` : 'available on Kumbaya DEX'}. Burn cost: ~${data.burnCost?.ethEstimate || '???'} ETH (${BURN_AMOUNT_DISPLAY.toLocaleString()} tokens) + 1 USDm infra fee.`,
        actions: [
          { type: 'query', label: 'Get swap quote', description: 'Quote for 0.1 ETH', apiCall: { method: 'GET', endpoint: '/api/x402/quote?ethAmount=0.1' } },
        ],
      };
    }

    case 'stats': {
      const data = await fetch(`${BASE}/api/stats`).then(r => r.json()).catch(() => ({}));
      return {
        intent,
        understanding: 'Protocol statistics',
        answer: `$MEGACHAD: ${data.totalBurns || 0} burns, ${data.tokensBurned ? Number(data.tokensBurned).toLocaleString() : '???'} tokens burned, circulating: ${data.circulatingSupply ? Number(data.circulatingSupply).toLocaleString() : '???'}.`,
        actions: [
          { type: 'query', label: 'View gallery', description: 'Recent burns', apiCall: { method: 'GET', endpoint: '/api/gallery?limit=5' } },
          { type: 'query', label: 'View leaderboard', description: 'Top burners', apiCall: { method: 'GET', endpoint: '/api/chadboard' } },
        ],
      };
    }

    case 'wallet': {
      if (!wallet) {
        return { intent, understanding: 'Check wallet', answer: 'Provide a wallet address to check.', actions: [] };
      }
      const data = await fetch(`${BASE}/api/wallet?address=${wallet}`).then(r => r.json()).catch(() => ({}));
      const identity = await fetch(`${BASE}/api/identity/${wallet}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `Check wallet ${wallet.slice(0, 8)}...`,
        answer: `${identity?.megaName || wallet.slice(0, 8) + '...'}: ${data.megachadBalance || '0'} $MEGACHAD, ${data.ethBalance || '0'} ETH. ${data.burnEligible ? 'Eligible to burn.' : 'Need ' + BURN_AMOUNT_DISPLAY.toLocaleString() + ' $MEGACHAD to burn.'}`,
        actions: [
          { type: 'query', label: 'Full profile', description: 'Identity + burn history', apiCall: { method: 'GET', endpoint: `/api/identity/${wallet}` } },
          { type: 'query', label: 'Looksmaxx plan', description: 'Step-by-step burn plan', apiCall: { method: 'GET', endpoint: `/api/agent/looksmaxx?wallet=${wallet}` } },
        ],
        state: { wallet, megachadBalance: data.megachadBalance, ethBalance: data.ethBalance, hasEnoughTokens: data.burnEligible },
      };
    }

    case 'gallery': {
      const data = await fetch(`${BASE}/api/gallery?limit=5`).then(r => r.json()).catch(() => ({}));
      return {
        intent,
        understanding: 'Recent looksmaxxes',
        answer: `Showing ${data.burns?.length || 0} most recent looksmaxxed burns.`,
        actions: [
          { type: 'query', label: 'More results', description: '20 recent burns', apiCall: { method: 'GET', endpoint: '/api/gallery?limit=20' }, result: data },
        ],
      };
    }

    case 'leaderboard': {
      const data = await fetch(`${BASE}/api/chadboard`).then(r => r.json()).catch(() => ({}));
      const top = data.entries?.slice(0, 5) || [];
      const topStr = top.map((b: { megaName?: string; address?: string; totalBurns?: number }, i: number) =>
        `${i + 1}. ${b.megaName || b.address?.slice(0, 8) || '???'} (${b.totalBurns || 0} burns)`
      ).join('\n');
      return {
        intent,
        understanding: 'Top burners leaderboard',
        answer: `Top burners:\n${topStr || 'No burns yet.'}`,
        actions: top.map((b: { address: string; megaName?: string }) => ({
          type: 'query' as const,
          label: `View ${b.megaName || b.address.slice(0, 8)} profile`,
          description: 'Full identity profile',
          apiCall: { method: 'GET', endpoint: `/api/identity/${b.address}` },
        })),
      };
    }

    case 'referral': {
      let referralData = null;
      if (wallet) {
        referralData = await fetch(`${BASE}/api/agent/referrals?address=${wallet}`).then(r => r.json()).catch(() => null);
      }
      return {
        intent,
        understanding: 'Referral program info',
        answer: `Agents earn 11,250 $MEGACHAD (5%) per referred burn. ${referralData ? `Your stats: ${referralData.referralCount || 0} referrals, ${Number(referralData.totalEarnings || 0).toLocaleString()} earned.` : 'Register as an agent to start earning.'}`,
        actions: wallet ? [
          buildRegisterAgentCalldata(),
          { type: 'query', label: 'Check referral stats', description: 'Your earnings', apiCall: { method: 'GET', endpoint: `/api/agent/referrals?address=${wallet}` } },
        ] : [],
      };
    }

    case 'gasless': {
      return {
        intent,
        understanding: 'Gasless burn info',
        answer: 'MegaChad supports gasless burns via EIP-712 signatures. Approve the relayer once, then sign messages to burn without gas. The relayer submits transactions for you.',
        actions: wallet ? [
          { type: 'query', label: 'Check gasless status', description: 'Approval + nonce', apiCall: { method: 'GET', endpoint: `/api/gasless/burn?address=${wallet}` } },
        ] : [],
      };
    }

    case 'about': {
      return {
        intent,
        understanding: 'What is MegaChad',
        answer: 'MegaChad is a burn-to-create looksmaxxing engine on MegaETH. Burn 225,000 $MEGACHAD (50% burned forever + 50% to tren fund) to generate an AI-enhanced portrait and mint it as an NFT. Features: gasless burns, agent referrals, cross-chain intents, x402 payments, MCP integration, and on-chain reputation via ERC-8004.',
        actions: [
          { type: 'query', label: 'View stats', description: 'Protocol statistics', apiCall: { method: 'GET', endpoint: '/api/stats' } },
          { type: 'query', label: 'View price', description: 'Current price', apiCall: { method: 'GET', endpoint: '/api/price' } },
          { type: 'query', label: 'MCP tools', description: 'Agent integration', apiCall: { method: 'GET', endpoint: '/api/agent/info' } },
        ],
      };
    }

    case 'schedule': {
      return {
        intent,
        understanding: 'Schedule recurring burns',
        answer: 'Scheduled burns are coming with ERC-4337 session keys. You\'ll be able to pre-authorize recurring burns (daily/weekly/monthly) with a single signature, and the protocol executes them automatically. Stay tuned.',
        actions: wallet ? [
          { type: 'query', label: 'Check balance', description: 'Current holdings', apiCall: { method: 'GET', endpoint: `/api/wallet?address=${wallet}` } },
        ] : [],
      };
    }

    case 'protocol_registry': {
      const reg = await fetch(`${BASE}/.well-known/megachad-protocol.json`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: 'Return the full protocol registry',
        answer: 'Canonical machine-readable registry with every contract address, ABI hints, agent endpoints, and known gotchas. Pull this once and cache.',
        actions: [
          { type: 'query', label: 'Registry JSON', description: 'Full protocol registry', apiCall: { method: 'GET', endpoint: '/.well-known/megachad-protocol.json' }, result: reg },
        ],
      };
    }

    case 'emission_schedule': {
      const data = await fetch(`${BASE}/api/defi/emission`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: 'MEGAGOONER emission schedule',
        answer: data
          ? `Week ${data.currentWeek} of 225. Split: ${data.splitPct.moggerStaking}% MoggerStaking / ${data.splitPct.jesterGooner}% JESTERGOONER / ${data.splitPct.treasury}% Treasury. Current week emission: ${Number(data.currentWeekEmissionOnchain?.human || 0).toLocaleString()} MEGAGOONER.`
          : 'Emission data temporarily unavailable.',
        actions: [
          { type: 'query', label: 'Full schedule', description: '225-week schedule + split', apiCall: { method: 'GET', endpoint: '/api/defi/emission' }, result: data },
        ],
      };
    }

    case 'staking_position': {
      if (!wallet) {
        return { intent, understanding: 'Staking position', answer: 'Pass a wallet address to see your staking position.', actions: [] };
      }
      const data = await fetch(`${BASE}/api/defi/staking?address=${wallet}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: 'Staking position lookup',
        answer: data?.position
          ? `Mogger: ${data.position.moggerStaking.stakedHuman} MEGACHAD staked, ${data.position.moggerStaking.earnedRewardsHuman} MG pending. Jester V4: ${data.position.jesterGooner.stakedHuman} LP staked, ${data.position.jesterGooner.earnedRewardsHuman} MG pending. ${data.position.eligible ? '' : 'NOT ELIGIBLE — need 1+ MEGACHADNFT.'}`
          : 'No position data.',
        actions: [{ type: 'query', label: 'Position detail', description: 'Full staking state', apiCall: { method: 'GET', endpoint: `/api/defi/staking?address=${wallet}` }, result: data }],
      };
    }

    case 'stake':
    case 'unstake': {
      const venue = (params.style as 'mogger' | 'jester') || 'mogger';
      const amount = params.amount;
      if (!amount) {
        return { intent, understanding: `${intent} on ${venue}`, answer: `Specify an amount to ${intent}.`, actions: [] };
      }
      const qs = new URLSearchParams({ action: intent, venue, amount });
      if (wallet) qs.set('address', wallet);
      const data = await fetch(`${BASE}/api/defi/staking/tx?${qs}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `${intent} ${amount} on ${venue}`,
        answer: `Built ${data?.executionPlan?.length || 0}-step ${intent} plan for ${amount} on ${venue === 'mogger' ? 'MoggerStaking' : 'JESTERGOONER V4'}.`,
        actions: [{ type: 'query', label: `${intent} tx`, description: `${venue} ${intent}`, apiCall: { method: 'GET', endpoint: `/api/defi/staking/tx?${qs}` }, result: data }],
      };
    }

    case 'claim_rewards': {
      const venue = (params.style as 'mogger' | 'jester') || 'mogger';
      const qs = new URLSearchParams({ action: 'claim', venue });
      if (wallet) qs.set('address', wallet);
      const data = await fetch(`${BASE}/api/defi/staking/tx?${qs}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `Claim MEGAGOONER from ${venue}`,
        answer: `Built claim tx for ${venue === 'mogger' ? 'MoggerStaking' : 'JESTERGOONER V4'}.`,
        actions: [{ type: 'query', label: 'Claim tx', description: `${venue} claim`, apiCall: { method: 'GET', endpoint: `/api/defi/staking/tx?${qs}` }, result: data }],
      };
    }

    case 'swap_mc_mg': {
      const from = (params.style as 'MC' | 'MG') || 'MC';
      const amount = params.amount;
      if (!amount) {
        return { intent, understanding: `Swap ${from}`, answer: 'Specify an amount to swap.', actions: [] };
      }
      const quote = await fetch(`${BASE}/api/defi/amm/quote?from=${from}&amount=${amount}`).then(r => r.json()).catch(() => null);
      const txQs = new URLSearchParams({ from, amount, recipient: wallet || '<YOUR_ADDRESS>' });
      const tx = wallet ? await fetch(`${BASE}/api/defi/amm/swap-tx?${txQs}`).then(r => r.json()).catch(() => null) : null;
      return {
        intent,
        understanding: `Swap ${amount} ${from} → ${from === 'MC' ? 'MG' : 'MC'}`,
        answer: quote?.quote
          ? `Quote: ${quote.quote.amountInHuman} ${from} → ${Number(quote.quote.amountOutHuman).toFixed(4)} ${quote.quote.to} (impact: ${quote.quote.priceImpactPct.toFixed(2)}%).`
          : 'Quote unavailable.',
        actions: [
          { type: 'query', label: 'AMM quote', description: 'MC/MG pool quote', apiCall: { method: 'GET', endpoint: `/api/defi/amm/quote?from=${from}&amount=${amount}` }, result: quote },
          ...(tx ? [{ type: 'query' as const, label: 'Swap tx plan', description: 'transfer + swap', apiCall: { method: 'GET', endpoint: `/api/defi/amm/swap-tx?${txQs}` }, result: tx }] : []),
        ],
      };
    }

    case 'add_liquidity': {
      return {
        intent,
        understanding: 'Add MC/MG liquidity',
        answer: 'Provide both amountMC and amountMG to /api/defi/amm/add-liquidity-tx to get the approve+approve+addLiquidity plan. LP shares are stake-eligible in JESTERGOONER V4.',
        actions: [
          { type: 'query', label: 'AMM reserves', description: 'Current pool state', apiCall: { method: 'GET', endpoint: '/api/defi/amm/quote' } },
        ],
      };
    }

    case 'list_proposals': {
      const data = await fetch(`${BASE}/api/defi/governance/proposals?limit=20`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: 'List Jestermogger proposals',
        answer: data?.proposals
          ? `${data.total} total proposals. Returning latest ${data.returned}: ${data.proposals.slice(0, 3).map((p: { id: number; state: string }) => `#${p.id} (${p.state})`).join(', ')}${data.returned > 3 ? '…' : ''}.`
          : 'No proposals.',
        actions: [{ type: 'query', label: 'Proposals', description: 'Recent governance', apiCall: { method: 'GET', endpoint: '/api/defi/governance/proposals?limit=20' }, result: data }],
      };
    }

    case 'proposal_detail': {
      const id = params.query;
      if (!id) return { intent, understanding: 'Proposal detail', answer: 'Specify a proposal id.', actions: [] };
      const url = wallet ? `/api/defi/governance/proposals/${id}?voter=${wallet}` : `/api/defi/governance/proposals/${id}`;
      const data = await fetch(`${BASE}${url}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `Proposal #${id}`,
        answer: data?.proposal
          ? `Proposal #${id}: ${data.proposal.state}. For ${data.proposal.votes.for}, Against ${data.proposal.votes.against}, Abstain ${data.proposal.votes.abstain}.`
          : 'Proposal not found.',
        actions: [{ type: 'query', label: 'Proposal', description: `#${id}`, apiCall: { method: 'GET', endpoint: url }, result: data }],
      };
    }

    case 'vote': {
      const id = params.query;
      const support = params.style || 'for';
      if (!id) return { intent, understanding: 'Vote', answer: 'Specify a proposal id.', actions: [] };
      const data = await fetch(`${BASE}/api/defi/governance/vote-tx?proposalId=${id}&support=${support}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `Vote ${support} on #${id}`,
        answer: `Built castVote tx (${support}) for proposal #${id}.`,
        actions: [{ type: 'query', label: 'Vote tx', description: `${support} #${id}`, apiCall: { method: 'GET', endpoint: `/api/defi/governance/vote-tx?proposalId=${id}&support=${support}` }, result: data }],
      };
    }

    case 'queue_proposal':
    case 'execute_proposal': {
      const id = params.query;
      if (!id) return { intent, understanding: intent, answer: 'Specify a proposal id.', actions: [] };
      const path = intent === 'queue_proposal' ? 'queue-tx' : 'execute-tx';
      const data = await fetch(`${BASE}/api/defi/governance/${path}?proposalId=${id}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `${intent.replace('_proposal', '')} #${id}`,
        answer: `Built ${intent.replace('_proposal', '')} tx for proposal #${id}.`,
        actions: [{ type: 'query', label: `${intent} tx`, description: `#${id}`, apiCall: { method: 'GET', endpoint: `/api/defi/governance/${path}?proposalId=${id}` }, result: data }],
      };
    }

    case 'nft_inventory': {
      const wallet = params.wallet;
      if (!wallet) return { intent, understanding: 'NFT inventory', answer: 'Pass a wallet address to check NFT holdings + staking eligibility.', actions: [] };
      const data = await fetch(`${BASE}/api/defi/nft?address=${wallet}`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `NFT inventory for ${wallet}`,
        answer: data?.eligibility?.reason || 'Fetched NFT inventory.',
        actions: [{ type: 'query', label: 'NFT inventory', description: wallet, apiCall: { method: 'GET', endpoint: `/api/defi/nft?address=${wallet}` }, result: data }],
      };
    }

    case 'safety': {
      const data = await fetch(`${BASE}/api/defi/safety`).then(r => r.json()).catch(() => null);
      const paused = data?.circuitBreaker?.paused;
      return {
        intent,
        understanding: 'Protocol safety status',
        answer: paused === true ? 'Protocol is PAUSED — writes will revert.' : paused === false ? 'Protocol is healthy. Writes are safe.' : 'Fetched safety status.',
        actions: [{ type: 'query', label: 'Safety status', description: 'CircuitBreaker + veto council', apiCall: { method: 'GET', endpoint: '/api/defi/safety' }, result: data }],
      };
    }

    case 'activity': {
      const data = await fetch(`${BASE}/api/defi/activity?limit=50`).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: 'Recent protocol activity',
        answer: `Recent on-chain activity across MEGA Protocol (${data?.returned ?? 0} events).`,
        actions: [{ type: 'query', label: 'Activity feed', description: 'Last ~2000 blocks', apiCall: { method: 'GET', endpoint: '/api/defi/activity?limit=50' }, result: data }],
      };
    }

    case 'propose': {
      const proposer = params.wallet;
      const url = proposer ? `${BASE}/api/defi/governance/propose-tx?proposer=${proposer}` : `${BASE}/api/defi/governance/propose-tx`;
      const data = await fetch(url).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: proposer ? `Propose eligibility for ${proposer}` : 'Propose-tx template',
        answer: data?.eligibility?.proposerNote || 'POST your proposal payload to /api/defi/governance/propose-tx to get calldata.',
        actions: [{ type: 'query', label: 'Propose builder', description: proposer || 'template only', apiCall: { method: 'GET', endpoint: proposer ? `/api/defi/governance/propose-tx?proposer=${proposer}` : '/api/defi/governance/propose-tx' }, result: data }],
      };
    }

    case 'veto': {
      const id = params.query;
      const support = params.style || 'yes';
      const voter = params.wallet;
      if (!id) return { intent, understanding: 'Veto', answer: 'Specify a proposal id.', actions: [] };
      const url = voter
        ? `${BASE}/api/defi/governance/veto-tx?proposalId=${id}&support=${support}&voter=${voter}`
        : `${BASE}/api/defi/governance/veto-tx?proposalId=${id}&support=${support}`;
      const data = await fetch(url).then(r => r.json()).catch(() => null);
      return {
        intent,
        understanding: `Veto-${support} on #${id}`,
        answer: `Built veto tx (${support}) for proposal #${id}.`,
        actions: [{ type: 'query', label: 'Veto tx', description: `#${id} ${support}`, apiCall: { method: 'GET', endpoint: `/api/defi/governance/veto-tx?proposalId=${id}&support=${support}${voter ? `&voter=${voter}` : ''}` }, result: data }],
      };
    }

    default: {
      return {
        intent: 'help',
        understanding: 'General help',
        answer: 'I can help you with: looksmaxxing (swap + burn + mint), swapping ETH for $MEGACHAD, MC↔MG swaps on MegaChadLP, MoggerStaking / JESTERGOONER staking + claims, Jestermogger governance (list / vote / queue / execute), MEGAGOONER emission schedule, the protocol registry, bridging, gasless burns, referrals, gallery, and leaderboard.',
        actions: [
          { type: 'query', label: 'Get price', description: 'Current price + burn cost', apiCall: { method: 'GET', endpoint: '/api/price' } },
          { type: 'query', label: 'View stats', description: 'Protocol statistics', apiCall: { method: 'GET', endpoint: '/api/stats' } },
          { type: 'query', label: 'View gallery', description: 'Recent burns', apiCall: { method: 'GET', endpoint: '/api/gallery?limit=5' } },
        ],
      };
    }
  }
}
