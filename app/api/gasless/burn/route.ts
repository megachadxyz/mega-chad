import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, getAddress, encodeFunctionData, maxUint256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaeth } from '@/lib/wagmi';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI, BURN_AMOUNT } from '@/lib/contracts';
import { RELAYER_ADDRESS, RELAYER_ABI } from '@/lib/relayer';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

function getRelayerWallet() {
  const key = process.env.MINTER_PRIVATE_KEY;
  if (!key) throw new Error('MINTER_PRIVATE_KEY not configured');
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({
    account,
    chain: megaeth,
    transport: http(),
  });
}

/**
 * GET /api/gasless/burn?address=0x...
 *
 * Returns the EIP-712 typed data the user needs to sign, plus their current
 * approval and nonce status.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Missing or invalid address' }, { status: 400 });
  }

  const addr = getAddress(address);

  // Check approval, nonce, and balance in parallel
  const [allowance, nonce, balance] = await Promise.all([
    viemClient.readContract({
      address: MEGACHAD_ADDRESS,
      abi: MEGACHAD_ABI,
      functionName: 'allowance',
      args: [addr, RELAYER_ADDRESS],
    }) as Promise<bigint>,
    viemClient.readContract({
      address: RELAYER_ADDRESS,
      abi: RELAYER_ABI,
      functionName: 'getNonce',
      args: [addr],
    }) as Promise<bigint>,
    viemClient.readContract({
      address: MEGACHAD_ADDRESS,
      abi: MEGACHAD_ABI,
      functionName: 'balanceOf',
      args: [addr],
    }) as Promise<bigint>,
  ]);

  const hasApproval = allowance >= BURN_AMOUNT;
  const hasBalance = balance >= BURN_AMOUNT;
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  return NextResponse.json({
    ready: hasApproval && hasBalance,
    approval: {
      hasApproval,
      currentAllowance: allowance.toString(),
      required: BURN_AMOUNT.toString(),
      ...(hasApproval
        ? {}
        : {
            approveTransaction: {
              to: MEGACHAD_ADDRESS,
              data: encodeFunctionData({
                abi: MEGACHAD_ABI,
                functionName: 'approve',
                args: [RELAYER_ADDRESS, maxUint256],
              }),
              chainId: 4326,
              note: 'Approve relayer for max uint256 (one-time, costs gas)',
            },
          }),
    },
    balance: {
      hasBalance,
      current: balance.toString(),
      required: BURN_AMOUNT.toString(),
    },
    signTypedData: {
      domain: {
        name: 'MegaChadRelayer',
        version: '1',
        chainId: 4326,
        verifyingContract: RELAYER_ADDRESS,
      },
      types: {
        BurnRequest: [
          { name: 'burner', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'BurnRequest',
      message: {
        burner: addr,
        nonce: nonce.toString(),
        deadline: deadline.toString(),
      },
    },
    relayerContract: RELAYER_ADDRESS,
  });
}

/**
 * POST /api/gasless/burn
 *
 * Submit a signed burn request. The backend relays it on-chain (pays gas).
 *
 * Body: { burner, deadline, signature }
 */
export async function POST(req: NextRequest) {
  let body: { burner?: string; deadline?: number; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { burner, deadline, signature } = body;

  if (!burner?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Invalid burner address' }, { status: 400 });
  }
  if (!deadline || deadline < Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: 'Missing or expired deadline' }, { status: 400 });
  }
  if (!signature?.match(/^0x[a-fA-F0-9]{130}$/)) {
    return NextResponse.json({ error: 'Invalid signature (expected 65-byte hex)' }, { status: 400 });
  }

  const addr = getAddress(burner);

  // Parse signature into v, r, s
  const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
  const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
  const v = parseInt(signature.slice(130, 132), 16);

  try {
    const walletClient = getRelayerWallet();

    const txHash = await walletClient.writeContract({
      address: RELAYER_ADDRESS,
      abi: RELAYER_ABI,
      functionName: 'relayBurn',
      args: [addr, BigInt(deadline), v, r, s],
    });

    // Wait for receipt
    const receipt = await viemClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 20_000,
    });

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: `https://megaexplorer.xyz/tx/${txHash}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Relay failed';
    console.error('[gasless/burn] Relay error:', message);

    if (message.includes('Signature expired')) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 400 });
    }
    if (message.includes('Invalid signature')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    if (message.includes('transfer failed') || message.includes('insufficient')) {
      return NextResponse.json(
        { error: 'Burn failed — check token balance and relayer approval' },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Relay transaction failed' }, { status: 500 });
  }
}
