import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, encodeFunctionData, http, type TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { isTxUsed, markTxUsed } from '@/lib/redis';
import { megaeth } from '@/lib/wagmi';

export const maxDuration = 60;

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const BURN_AMOUNT = BigInt(process.env.NEXT_PUBLIC_BURN_AMOUNT || '225000');

const viemClient = createPublicClient({ chain: megaeth, transport: http() });

function getMinterWalletClient() {
  const pk = process.env.MINTER_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({ account, chain: megaeth, transport: http() });
}

const MINT_ABI = [
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenURI', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * IPFS-only mint — used as fallback when user cancels Warren payment.
 * Burns are already verified and image+metadata are already pinned to IPFS.
 * Just mints the NFT and records the burn in Redis.
 */
export async function POST(req: NextRequest) {
  try {
    const { burnerAddress, burnTxHash, devTxHash, metadataUrl, ipfsUrl, ipfsCid } = await req.json();

    if (!burnerAddress || !burnTxHash || !metadataUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prevent replay
    try {
      if (await isTxUsed(burnTxHash)) {
        return NextResponse.json({ error: 'This burn transaction has already been used' }, { status: 409 });
      }
    } catch {
      console.warn('[IPFS Mint] Redis unavailable — skipping replay check');
    }

    const walletClient = getMinterWalletClient();
    if (!walletClient || NFT_CONTRACT === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'NFT minting not configured' }, { status: 500 });
    }

    console.log('[IPFS Mint] Minting with IPFS metadata for:', burnerAddress);

    const request = await walletClient.prepareTransactionRequest({
      account: walletClient.account!,
      to: NFT_CONTRACT,
      data: encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mint',
        args: [burnerAddress as `0x${string}`, metadataUrl],
      }),
    });

    const signedTx = await walletClient.signTransaction(request);
    const mintReceipt = (await viemClient.request({
      method: 'eth_sendRawTransactionSync' as any,
      params: [signedTx],
    })) as TransactionReceipt;

    let tokenId: string | null = null;
    if (mintReceipt?.logs) {
      const transferLog = mintReceipt.logs.find(
        (log) => log.address.toLowerCase() === NFT_CONTRACT.toLowerCase() && log.topics.length >= 4
      );
      if (transferLog?.topics[3]) {
        tokenId = BigInt(transferLog.topics[3]).toString();
      }
    }

    console.log('[IPFS Mint] Minted tokenId:', tokenId);

    // Record in Redis
    try {
      await markTxUsed({
        txHash: burnTxHash,
        burner: burnerAddress,
        prompt: 'looksmaxx',
        cid: ipfsCid || '',
        ipfsUrl: ipfsUrl || '',
        timestamp: new Date().toISOString(),
        burnAmount: Number(BURN_AMOUNT) / 2,
        tokenId: tokenId || undefined,
      });
    } catch (err) {
      console.warn('[IPFS Mint] Redis store failed (non-fatal):', err);
    }

    return NextResponse.json({ tokenId, ipfsUrl });
  } catch (error) {
    console.error('[IPFS Mint] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'IPFS mint failed' },
      { status: 500 }
    );
  }
}
