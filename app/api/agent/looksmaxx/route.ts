import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, encodeFunctionData } from 'viem';
import { megaeth } from '@/lib/wagmi';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI, BURN_AMOUNT, BURN_AMOUNT_DISPLAY, BURN_ADDRESS, TREN_FUND_WALLET } from '@/lib/contracts';
import {
  KUMBAYA_QUOTER_V2,
  KUMBAYA_SWAP_ROUTER,
  WETH,
  QUOTER_V2_ABI,
  SWAP_ROUTER_ABI,
  DEFAULT_FEE,
} from '@/lib/kumbaya';
import { buildPaymentRequirements, LOOKSMAXX_INFRA_FEE } from '@/lib/x402';

export const dynamic = 'force-dynamic';

const BURN_HALF = BURN_AMOUNT / 2n;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

/**
 * GET /api/agent/looksmaxx?wallet=0x...&ethAmount=0.5
 *
 * Returns a complete, ordered set of transaction instructions for an agent
 * to execute the full looksmaxx flow: swap → burn → burn → submit.
 * Each step includes pre-built calldata ready to sign and send.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const ethAmount = req.nextUrl.searchParams.get('ethAmount');

  if (!wallet?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Missing or invalid wallet parameter' }, { status: 400 });
  }

  const addr = wallet as `0x${string}`;

  // Check current balances
  let tokenBalance = 0n;
  let ethBalance = 0n;

  try {
    [tokenBalance, ethBalance] = await Promise.all([
      viemClient.readContract({
        address: MEGACHAD_ADDRESS,
        abi: MEGACHAD_ABI,
        functionName: 'balanceOf',
        args: [addr],
      }) as Promise<bigint>,
      viemClient.getBalance({ address: addr }),
    ]);
  } catch (err) {
    console.error('[agent/looksmaxx] Balance check failed:', err);
  }

  const hasEnoughTokens = tokenBalance >= BURN_AMOUNT;
  const tokenBalanceDisplay = Number(formatUnits(tokenBalance, 18));

  const steps: Array<{
    step: number;
    action: string;
    description: string;
    skip?: boolean;
    skipReason?: string;
    transaction?: Record<string, unknown>;
    postRequest?: Record<string, unknown>;
  }> = [];

  // Step 1: Swap ETH → MEGACHAD (skip if already has enough tokens)
  if (hasEnoughTokens) {
    steps.push({
      step: 1,
      action: 'swap',
      description: `Swap ETH for $MEGACHAD on Kumbaya DEX`,
      skip: true,
      skipReason: `Wallet already has ${tokenBalanceDisplay} $MEGACHAD (need ${BURN_AMOUNT_DISPLAY})`,
    });
  } else {
    let swapQuote = null;
    const tokensNeeded = BURN_AMOUNT - tokenBalance;

    if (ethAmount) {
      try {
        const amountInWei = BigInt(Math.floor(parseFloat(ethAmount) * 1e18));
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
        const amountOut = result.result[0];
        const minOut = (amountOut * 98n) / 100n; // 2% slippage

        swapQuote = {
          ethIn: ethAmount,
          ethInWei: amountInWei.toString(),
          megachadOut: Number(formatUnits(amountOut, 18)),
          megachadOutWei: amountOut.toString(),
          sufficient: amountOut >= tokensNeeded,
        };

        const swapCalldata = encodeFunctionData({
          abi: SWAP_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [
            {
              tokenIn: WETH,
              tokenOut: MEGACHAD_ADDRESS,
              fee: DEFAULT_FEE,
              recipient: addr,
              amountIn: amountInWei,
              amountOutMinimum: minOut,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });

        steps.push({
          step: 1,
          action: 'swap',
          description: `Swap ${ethAmount} ETH for ~${swapQuote.megachadOut.toLocaleString()} $MEGACHAD`,
          transaction: {
            to: KUMBAYA_SWAP_ROUTER,
            value: amountInWei.toString(),
            data: swapCalldata,
            chainId: 4326,
            note: 'Send native ETH as msg.value — router wraps to WETH',
          },
        });
      } catch {
        steps.push({
          step: 1,
          action: 'swap',
          description: 'Swap ETH for $MEGACHAD — quote failed, provide ethAmount to get calldata',
        });
      }
    } else {
      steps.push({
        step: 1,
        action: 'swap',
        description: `Need ${Number(formatUnits(tokensNeeded, 18)).toLocaleString()} more $MEGACHAD. Add ?ethAmount=<amount> to get pre-built swap calldata.`,
        transaction: {
          to: KUMBAYA_SWAP_ROUTER,
          note: 'Provide ethAmount query param to get full calldata',
        },
      });
    }
  }

  // Step 2: Burn half to dead address
  const burnCalldata = encodeFunctionData({
    abi: MEGACHAD_ABI,
    functionName: 'transfer',
    args: [BURN_ADDRESS, BURN_HALF],
  });

  steps.push({
    step: 2,
    action: 'burn',
    description: `Transfer ${BURN_AMOUNT_DISPLAY / 2} $MEGACHAD to burn address`,
    transaction: {
      to: MEGACHAD_ADDRESS,
      data: burnCalldata,
      chainId: 4326,
      note: `Sends ${BURN_AMOUNT_DISPLAY / 2} tokens to ${BURN_ADDRESS}`,
    },
  });

  // Step 3: Transfer half to tren fund
  const trenCalldata = encodeFunctionData({
    abi: MEGACHAD_ABI,
    functionName: 'transfer',
    args: [TREN_FUND_WALLET, BURN_HALF],
  });

  steps.push({
    step: 3,
    action: 'tren_fund',
    description: `Transfer ${BURN_AMOUNT_DISPLAY / 2} $MEGACHAD to tren fund`,
    transaction: {
      to: MEGACHAD_ADDRESS,
      data: trenCalldata,
      chainId: 4326,
      note: `Sends ${BURN_AMOUNT_DISPLAY / 2} tokens to ${TREN_FUND_WALLET}`,
    },
  });

  // Step 4: x402 payment + image submission
  const paymentRequirements = buildPaymentRequirements(
    'https://megachad.xyz/api/x402/looksmaxx',
    'Looksmaxx infra fee',
    LOOKSMAXX_INFRA_FEE,
  );

  steps.push({
    step: 4,
    action: 'submit',
    description: 'POST burn proof + x402 payment + base64 image to looksmaxx endpoint',
    postRequest: {
      method: 'POST',
      url: 'https://megachad.xyz/api/x402/looksmaxx',
      contentType: 'application/json',
      bodyTemplate: {
        burnTxHash: '<tx_hash_from_step_2>',
        devTxHash: '<tx_hash_from_step_3>',
        burnerAddress: addr,
        image: '<base64_encoded_portrait_image>',
        imageType: 'image/png',
        paymentPayload: {
          x402Version: 1,
          scheme: 'exact',
          network: 'megaeth',
          payload: {
            signature: '<eip712_signature>',
            authorization: '<transfer_with_authorization_params>',
          },
        },
      },
      paymentRequirements,
    },
  });

  return NextResponse.json(
    {
      wallet: addr,
      currentState: {
        ethBalance: formatUnits(ethBalance, 18),
        megachadBalance: tokenBalanceDisplay,
        hasEnoughTokens,
        tokensNeeded: hasEnoughTokens ? 0 : BURN_AMOUNT_DISPLAY - tokenBalanceDisplay,
      },
      steps,
      expectedResult: {
        description: 'AI-generated looksmaxxed portrait minted as NFT',
        returns: {
          imageUrl: 'Generated image URL',
          ipfsCid: 'IPFS content identifier',
          ipfsUrl: 'IPFS gateway URL',
          tokenId: 'Minted NFT token ID',
        },
      },
    },
    {
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
  );
}
