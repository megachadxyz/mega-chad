import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaeth } from '@/lib/wagmi';
import {
  MAINNET_MOGGER_STAKING_ADDRESS,
  MOGGER_STAKING_ABI,
} from '@/lib/mainnet-contracts';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Vercel cron route: pulls each unclaimed week of MEGAGOONER from EmissionController
// and notifies both MoggerStaking + JESTERGOONER drip pools. Permissionless on-chain,
// but we run it from a server wallet so users never have to trigger it manually.
//
// Calling distributeWeeklyRewards() on MoggerStaking routes through
// EmissionController.distributeEmissions() which mints + notifies BOTH staking
// contracts in the same tx — one call covers the whole protocol.
//
// Configure via vercel.json: { "crons": [{ "path": "/api/cron/distribute", "schedule": "0 * * * *" }] }
// CRON_SECRET protects the route; Vercel cron sends Authorization: Bearer $CRON_SECRET.

const DISTRIBUTOR_PRIVATE_KEY = process.env.DISTRIBUTOR_PRIVATE_KEY as `0x${string}` | undefined;
const CRON_SECRET = process.env.CRON_SECRET;

const publicClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!DISTRIBUTOR_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Distributor not configured' }, { status: 503 });
  }

  try {
    // Skip if the current drip period hasn't finished — no rewards to pull yet.
    const periodFinish = await publicClient.readContract({
      address: MAINNET_MOGGER_STAKING_ADDRESS,
      abi: MOGGER_STAKING_ABI,
      functionName: 'periodFinish',
    }) as bigint;

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    if (periodFinish > nowSec) {
      return NextResponse.json({
        skipped: true,
        reason: 'Drip period still active',
        periodFinish: Number(periodFinish),
        nowSec: Number(nowSec),
      });
    }

    const account = privateKeyToAccount(DISTRIBUTOR_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: megaeth,
      transport: http(),
    });

    const hash = await walletClient.writeContract({
      address: MAINNET_MOGGER_STAKING_ADDRESS,
      abi: MOGGER_STAKING_ABI,
      functionName: 'distributeWeeklyRewards',
      gas: 2_000_000n,
      gasPrice: 1_000_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 25_000 });

    return NextResponse.json({
      success: receipt.status === 'success',
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const alreadyClaimed = message.includes('AlreadyClaimed') || message.includes('NothingToDistribute');
    return NextResponse.json(
      {
        error: alreadyClaimed ? 'All eligible weeks already distributed' : message,
        alreadyClaimed,
      },
      { status: alreadyClaimed ? 200 : 500 },
    );
  }
}
