import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, encodeFunctionData, http, type TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet } from '@/lib/wagmi';
import { isWalletWhitelisted } from '@/lib/beta-auth';
import { TESTNET_NFT_ADDRESS, TESTNET_NFT_ABI } from '@/lib/testnet-contracts';

export const maxDuration = 30;

const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY as `0x${string}` | undefined;

const publicClient = createPublicClient({
  chain: megaethTestnet,
  transport: http(),
});

/**
 * POST /api/beta/mint-nft
 * Mints a Looksmaxxed NFT to a burner on testnet after a Framemogger burn.
 * Body: { address: string, burnTxHash: string }
 */
export async function POST(request: Request) {
  try {
    const { address, burnTxHash } = await request.json();

    if (!address || typeof address !== 'string' || !address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
    }

    if (!burnTxHash || typeof burnTxHash !== 'string') {
      return NextResponse.json({ error: 'burnTxHash required' }, { status: 400 });
    }

    // Whitelist check
    if (!isWalletWhitelisted(address)) {
      return NextResponse.json({ error: 'Wallet not whitelisted' }, { status: 403 });
    }

    if (!MINTER_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Minter not configured' }, { status: 503 });
    }

    if (TESTNET_NFT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'NFT contract not configured' }, { status: 503 });
    }

    // Verify the burn tx actually exists and is from this address
    const receipt = await publicClient.getTransactionReceipt({ hash: burnTxHash as `0x${string}` });
    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json({ error: 'Burn transaction not found or failed' }, { status: 400 });
    }
    if (receipt.from.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Burn tx sender does not match address' }, { status: 400 });
    }

    // Mint NFT
    const account = privateKeyToAccount(MINTER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: megaethTestnet,
      transport: http(),
    });

    const tokenURI = `https://megachad.xyz/api/nft/metadata?burner=${address}&burnTx=${burnTxHash}&network=testnet`;

    const request_ = await walletClient.prepareTransactionRequest({
      account,
      to: TESTNET_NFT_ADDRESS,
      data: encodeFunctionData({
        abi: TESTNET_NFT_ABI,
        functionName: 'mint',
        args: [address as `0x${string}`, tokenURI],
      }),
      gas: 2000000n,
    });

    const signedTx = await walletClient.signTransaction(request_);

    // Try sync send first (MegaETH-specific), fallback to standard
    let tokenId: string | null = null;
    try {
      const syncReceipt = (await publicClient.request({
        method: 'eth_sendRawTransactionSync' as never,
        params: [signedTx],
      })) as TransactionReceipt;

      if (syncReceipt?.logs) {
        const transferLog = syncReceipt.logs.find((log) =>
          log.address.toLowerCase() === TESTNET_NFT_ADDRESS.toLowerCase() && log.topics.length >= 4
        );
        if (transferLog?.topics[3]) {
          tokenId = BigInt(transferLog.topics[3]).toString();
        }
      }
    } catch {
      // Fallback: standard send + wait
      const hash = await walletClient.sendTransaction({
        to: TESTNET_NFT_ADDRESS,
        data: encodeFunctionData({
          abi: TESTNET_NFT_ABI,
          functionName: 'mint',
          args: [address as `0x${string}`, tokenURI],
        }),
        gas: 2000000n,
      });
      const mintReceipt = await publicClient.waitForTransactionReceipt({ hash });
      if (mintReceipt?.logs) {
        const transferLog = mintReceipt.logs.find((log) =>
          log.address.toLowerCase() === TESTNET_NFT_ADDRESS.toLowerCase() && log.topics.length >= 4
        );
        if (transferLog?.topics[3]) {
          tokenId = BigInt(transferLog.topics[3]).toString();
        }
      }
    }

    return NextResponse.json({ success: true, tokenId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Mint error';
    console.error('[beta/mint-nft] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
