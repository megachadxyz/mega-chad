import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { pinImage } from '@/lib/pinata';
import { isTxUsed, markTxUsed } from '@/lib/redis';
import { megaethTestnet } from '@/lib/wagmi';

const MEGACHAD_CONTRACT = (process.env.NEXT_PUBLIC_MEGACHAD_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const BURN_AMOUNT = BigInt(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') * 10n ** 18n;

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaethTestnet,
  transport: http(),
});

export async function POST(req: NextRequest) {
  // ── Validate env ──────────────────────────────────────
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not set' }, { status: 500 });
  }

  // ── Parse body ────────────────────────────────────────
  let body: { txHash?: string; prompt?: string; burnerAddress?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { txHash, prompt, burnerAddress } = body;

  if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing or invalid txHash' }, { status: 400 });
  }
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'Missing or empty prompt' }, { status: 400 });
  }
  if (!burnerAddress || typeof burnerAddress !== 'string') {
    return NextResponse.json({ error: 'Missing burnerAddress' }, { status: 400 });
  }

  // ── Check replay ──────────────────────────────────────
  try {
    if (await isTxUsed(txHash)) {
      return NextResponse.json({ error: 'This burn transaction has already been used' }, { status: 409 });
    }
  } catch {
    // Redis not configured — skip replay check in dev
    console.warn('Redis not available — skipping replay check');
  }

  // ── Verify burn on-chain ──────────────────────────────
  try {
    const receipt = await viemClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
    }

    // Find Transfer event to 0x0 (burn) from our contract
    const burnLog = receipt.logs.find((log) => {
      if (log.address.toLowerCase() !== MEGACHAD_CONTRACT.toLowerCase()) return false;
      if (log.topics.length < 3) return false;
      // topics[0] = event sig, topics[1] = from, topics[2] = to
      const to = ('0x' + (log.topics[2]?.slice(26) || '')) as `0x${string}`;
      return to.toLowerCase() === ZERO_ADDRESS;
    });

    if (!burnLog) {
      return NextResponse.json(
        { error: 'No burn event found in this transaction for our contract' },
        { status: 400 }
      );
    }

    // Verify amount
    const burnedAmount = BigInt(burnLog.data);
    if (burnedAmount < BURN_AMOUNT) {
      return NextResponse.json(
        { error: `Insufficient burn: ${burnedAmount} < ${BURN_AMOUNT}` },
        { status: 400 }
      );
    }

    // Verify burner
    const from = ('0x' + (burnLog.topics[1]?.slice(26) || '')) as `0x${string}`;
    if (from.toLowerCase() !== burnerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Burner address mismatch' }, { status: 400 });
    }
  } catch (err) {
    console.error('On-chain verification failed:', err);
    return NextResponse.json(
      { error: 'Failed to verify burn on-chain. Is the tx confirmed?' },
      { status: 502 }
    );
  }

  // ── Generate image ────────────────────────────────────
  const replicate = new Replicate({ auth: replicateToken });
  let imageUrl: string;

  try {
    const output = await replicate.run(
      'black-forest-labs/flux-schnell' as `${string}/${string}`,
      {
        input: {
          prompt: prompt.trim(),
          num_outputs: 1,
          aspect_ratio: '1:1',
        },
      }
    );
    imageUrl = Array.isArray(output) ? output[0] : (output as unknown as string);
    if (typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Unexpected Replicate output' }, { status: 500 });
    }
  } catch (err) {
    console.error('Replicate error:', err);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 502 });
  }

  // ── Pin to IPFS ───────────────────────────────────────
  let ipfsCid = '';
  let ipfsUrl = '';

  try {
    // Download image from Replicate CDN
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to download generated image');
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const pinResult = await pinImage(imgBuffer, {
      burner: burnerAddress,
      prompt: prompt.trim(),
      txHash,
    });

    ipfsCid = pinResult.cid;
    ipfsUrl = pinResult.url;
  } catch (err) {
    console.error('IPFS pinning failed:', err);
    // Return image URL even if pinning fails
    return NextResponse.json({
      imageUrl,
      ipfsCid: null,
      ipfsUrl: null,
      warning: 'Image generated but IPFS pinning failed',
    });
  }

  // ── Store in Redis ────────────────────────────────────
  try {
    await markTxUsed({
      txHash,
      burner: burnerAddress,
      prompt: prompt.trim(),
      cid: ipfsCid,
      ipfsUrl,
      timestamp: new Date().toISOString(),
    });
  } catch {
    console.warn('Redis store failed — image was still generated and pinned');
  }

  return NextResponse.json({
    imageUrl,
    ipfsCid,
    ipfsUrl,
  });
}
