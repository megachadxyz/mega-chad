import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { megaeth } from '@/lib/wagmi';
import {
  KUMBAYA_QUOTER_V2,
  KUMBAYA_SWAP_ROUTER,
  WETH,
  QUOTER_V2_ABI,
  DEFAULT_FEE,
} from '@/lib/kumbaya';
import { MEGACHAD_ADDRESS, BURN_AMOUNT, BURN_AMOUNT_DISPLAY, BURN_ADDRESS, TREN_FUND_WALLET } from '@/lib/contracts';

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

/**
 * GET /api/x402/quote?ethAmount=0.1
 *
 * Returns a swap quote and full transaction instructions for an agent
 * to buy $MEGACHAD with ETH via Kumbaya DEX (Uniswap V3 fork).
 */
export async function GET(req: NextRequest) {
  const ethAmount = req.nextUrl.searchParams.get('ethAmount');

  // If no amount specified, return general swap info + burn requirements
  if (!ethAmount) {
    // Quote how much ETH is needed for 225,000 $MEGACHAD (reverse quote not available,
    // so we provide the contract info for the agent to figure it out)
    return NextResponse.json({
      chain: {
        name: 'MegaETH',
        chainId: 4326,
        rpc: 'https://mainnet.megaeth.com/rpc',
      },
      token: {
        address: MEGACHAD_ADDRESS,
        symbol: 'MEGACHAD',
        decimals: 18,
      },
      dex: {
        name: 'Kumbaya',
        type: 'Uniswap V3 fork',
        swapRouter: KUMBAYA_SWAP_ROUTER,
        quoter: KUMBAYA_QUOTER_V2,
        weth: WETH,
        feeTier: DEFAULT_FEE,
      },
      burnRequirements: {
        totalAmount: BURN_AMOUNT.toString(),
        totalAmountDisplay: BURN_AMOUNT_DISPLAY,
        burnAddress: BURN_ADDRESS,
        burnAmount: (BURN_AMOUNT / 2n).toString(),
        burnAmountDisplay: BURN_AMOUNT_DISPLAY / 2,
        trenFundWallet: TREN_FUND_WALLET,
        trenFundAmount: (BURN_AMOUNT / 2n).toString(),
        trenFundAmountDisplay: BURN_AMOUNT_DISPLAY / 2,
      },
      instructions: {
        step1: `Call quoteExactInputSingle on ${KUMBAYA_QUOTER_V2} to get a quote for swapping ETH → MEGACHAD`,
        step2: `Call exactInputSingle on ${KUMBAYA_SWAP_ROUTER} with native ETH (msg.value) — router auto-wraps to WETH`,
        step3: `Transfer ${BURN_AMOUNT_DISPLAY / 2} MEGACHAD to ${BURN_ADDRESS} (burn)`,
        step4: `Transfer ${BURN_AMOUNT_DISPLAY / 2} MEGACHAD to ${TREN_FUND_WALLET} (tren fund)`,
        step5: 'POST burn proof + image to /api/x402/looksmaxx',
      },
    });
  }

  // Parse ETH amount
  let amountInWei: bigint;
  try {
    // Handle both decimal ("0.1") and wei ("100000000000000000") formats
    if (ethAmount.includes('.') || !ethAmount.match(/^\d{10,}$/)) {
      const parts = ethAmount.split('.');
      const whole = parts[0] || '0';
      const frac = (parts[1] || '').padEnd(18, '0').slice(0, 18);
      amountInWei = BigInt(whole) * 10n ** 18n + BigInt(frac);
    } else {
      amountInWei = BigInt(ethAmount);
    }
    if (amountInWei <= 0n) throw new Error('Amount must be positive');
  } catch {
    return NextResponse.json({ error: 'Invalid ethAmount parameter' }, { status: 400 });
  }

  // Get quote from Kumbaya Quoter
  try {
    const result = await viemClient.simulateContract({
      address: KUMBAYA_QUOTER_V2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn: WETH,
          tokenOut: MEGACHAD_ADDRESS,
          amountIn: amountInWei,
          fee: DEFAULT_FEE,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    const [amountOut, sqrtPriceX96After, ticksCrossed, gasEstimate] = result.result;

    const megachadOut = Number(formatUnits(amountOut, 18));
    const hasEnoughForBurn = amountOut >= BURN_AMOUNT;

    return NextResponse.json({
      quote: {
        ethIn: formatEther(amountInWei),
        ethInWei: amountInWei.toString(),
        megachadOut: megachadOut,
        megachadOutWei: amountOut.toString(),
        hasEnoughForBurn,
        burnRequirement: BURN_AMOUNT_DISPLAY,
        gasEstimate: gasEstimate.toString(),
      },
      swap: {
        router: KUMBAYA_SWAP_ROUTER,
        functionName: 'exactInputSingle',
        params: {
          tokenIn: WETH,
          tokenOut: MEGACHAD_ADDRESS,
          fee: DEFAULT_FEE,
          recipient: '<YOUR_ADDRESS>',
          amountIn: amountInWei.toString(),
          amountOutMinimum: ((amountOut * 98n) / 100n).toString(),
          sqrtPriceLimitX96: '0',
        },
        value: amountInWei.toString(),
        note: 'Send native ETH as msg.value — router wraps to WETH automatically',
      },
      chain: {
        name: 'MegaETH',
        chainId: 4326,
        rpc: 'https://mainnet.megaeth.com/rpc',
      },
    });
  } catch (err) {
    console.error('[quote] Quoter call failed:', err);
    return NextResponse.json(
      { error: 'Failed to get quote from Kumbaya DEX. The pool may have insufficient liquidity.' },
      { status: 502 },
    );
  }
}
