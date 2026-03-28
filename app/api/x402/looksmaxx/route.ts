import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { createPublicClient, createWalletClient, encodeFunctionData, http, type TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { pinImage, pinMetadata } from '@/lib/pinata';
import { isTxUsed, markTxUsed } from '@/lib/redis';
import { megaeth } from '@/lib/wagmi';
import {
  buildPaymentRequirements,
  settlePayment,
  LOOKSMAXX_INFRA_FEE,
  type PaymentPayload,
} from '@/lib/x402';
import {
  MEGACHAD_ADDRESS,
  NFT_ADDRESS,
  BURN_AMOUNT,
  BURN_ADDRESS,
} from '@/lib/contracts';

export const maxDuration = 120;

const MEGACHAD_CONTRACT = MEGACHAD_ADDRESS;
const NFT_CONTRACT = NFT_ADDRESS;

const BURN_HALF = BURN_AMOUNT / 2n;

const TREN_FUND_WALLET = (process.env.TREN_FUND_WALLET ||
  '0x85bf9272DEA7dff1781F71473187b96c6f2f370C') as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

function getMinterWalletClient() {
  const pk = process.env.MINTER_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({
    account,
    chain: megaeth,
    transport: http(),
  });
}

/**
 * GET — Returns HTTP 402 with payment requirements.
 * Agents discover what's needed: burn $MEGACHAD + pay small USDm infra fee.
 */
export async function GET() {
  const paymentRequirements = buildPaymentRequirements(
    'https://megachad.xyz/api/x402/looksmaxx',
    'Looksmaxx infra fee (covers AI generation + IPFS). You must also burn 225,000 $MEGACHAD (112,500 to dead address + 112,500 to tren fund) before calling POST.',
    LOOKSMAXX_INFRA_FEE,
  );

  return NextResponse.json(
    {
      x402Version: 1,
      accepts: [paymentRequirements],
      burnRequirements: {
        token: MEGACHAD_CONTRACT,
        totalAmount: BURN_AMOUNT.toString(),
        burnAddress: BURN_ADDRESS,
        burnAmount: BURN_HALF.toString(),
        trenFundWallet: TREN_FUND_WALLET,
        trenFundAmount: BURN_HALF.toString(),
        description: 'Burn 225,000 $MEGACHAD: send 112,500 to dead address + 112,500 to tren fund. Provide both tx hashes in POST body.',
      },
      instructions: {
        step1: 'Transfer 112,500 $MEGACHAD to 0x...dEaD (burn address)',
        step2: 'Transfer 112,500 $MEGACHAD to tren fund wallet',
        step3: 'Approve USDm to the forwarder and sign TransferWithAuthorization',
        step4: 'POST to this endpoint with burnTxHash, devTxHash, burnerAddress, image (base64), and paymentPayload',
      },
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-402-Version': '1',
      },
    },
  );
}

/**
 * POST — Agent submits burn proof + x402 payment + image.
 * Verifies burns on-chain, settles USDm payment, generates looksmaxxed image, mints NFT.
 */
export async function POST(req: NextRequest) {
  // ── Validate env ──────────────────────────────────────
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not set' }, { status: 500 });
  }

  // ── Parse JSON body ───────────────────────────────────
  let body: {
    burnTxHash: string;
    devTxHash: string;
    burnerAddress: string;
    image: string; // base64 encoded
    imageType?: string; // mime type, defaults to image/png
    paymentPayload: PaymentPayload;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { burnTxHash, devTxHash, burnerAddress, image, imageType, paymentPayload } = body;

  if (!burnTxHash?.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing or invalid burnTxHash' }, { status: 400 });
  }
  if (!devTxHash?.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing or invalid devTxHash' }, { status: 400 });
  }
  if (!burnerAddress) {
    return NextResponse.json({ error: 'Missing burnerAddress' }, { status: 400 });
  }
  if (!image) {
    return NextResponse.json({ error: 'Missing image (base64)' }, { status: 400 });
  }
  if (!paymentPayload?.payload?.signature) {
    return NextResponse.json({ error: 'Missing x402 paymentPayload' }, { status: 400 });
  }

  // Validate image size (base64 adds ~33% overhead, so 4MB file ≈ 5.3MB base64)
  const imageBuffer = Buffer.from(image, 'base64');
  if (imageBuffer.length > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 4MB' }, { status: 400 });
  }

  const mimeType = imageType || 'image/png';
  const validTypes = ['image/jpeg', 'image/png'];
  if (!validTypes.includes(mimeType)) {
    return NextResponse.json({ error: 'Image must be JPEG or PNG' }, { status: 400 });
  }

  // ── Check replay ──────────────────────────────────────
  try {
    if (await isTxUsed(burnTxHash)) {
      return NextResponse.json({ error: 'This burn transaction has already been used' }, { status: 409 });
    }
  } catch {
    console.warn('[x402] Redis not available — skipping replay check');
  }

  // ── Verify burn transfer on-chain ──────────────────────
  try {
    const burnReceipt = await viemClient.getTransactionReceipt({
      hash: burnTxHash as `0x${string}`,
    });

    if (burnReceipt.status !== 'success') {
      return NextResponse.json({ error: 'Burn transaction failed on-chain' }, { status: 400 });
    }

    const burnLog = burnReceipt.logs.find((log) => {
      if (log.address.toLowerCase() !== MEGACHAD_CONTRACT.toLowerCase()) return false;
      if (log.topics.length < 3) return false;
      const to = ('0x' + (log.topics[2]?.slice(26) || '')) as `0x${string}`;
      return to.toLowerCase() === BURN_ADDRESS.toLowerCase();
    });

    if (!burnLog) {
      return NextResponse.json(
        { error: 'No burn transfer event found in this transaction' },
        { status: 400 },
      );
    }

    const burnedAmount = BigInt(burnLog.data);
    if (burnedAmount < BURN_HALF) {
      return NextResponse.json(
        { error: `Insufficient burn: ${burnedAmount} < ${BURN_HALF}` },
        { status: 400 },
      );
    }

    const from = ('0x' + (burnLog.topics[1]?.slice(26) || '')) as `0x${string}`;
    if (from.toLowerCase() !== burnerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Burner address mismatch' }, { status: 400 });
    }
  } catch (err) {
    console.error('[x402] Burn verification failed:', err);
    return NextResponse.json(
      { error: 'Failed to verify burn on-chain. Is the tx confirmed?' },
      { status: 502 },
    );
  }

  // ── Verify tren fund transfer on-chain ─────────────────
  try {
    const devReceipt = await viemClient.getTransactionReceipt({
      hash: devTxHash as `0x${string}`,
    });

    if (devReceipt.status !== 'success') {
      return NextResponse.json({ error: 'Tren fund transfer failed on-chain' }, { status: 400 });
    }

    const devLog = devReceipt.logs.find((log) => {
      if (log.address.toLowerCase() !== MEGACHAD_CONTRACT.toLowerCase()) return false;
      if (log.topics.length < 3) return false;
      const to = ('0x' + (log.topics[2]?.slice(26) || '')) as `0x${string}`;
      return to.toLowerCase() === TREN_FUND_WALLET.toLowerCase();
    });

    if (!devLog) {
      return NextResponse.json(
        { error: 'No tren fund transfer event found in this transaction' },
        { status: 400 },
      );
    }

    const devAmount = BigInt(devLog.data);
    if (devAmount < BURN_HALF) {
      return NextResponse.json(
        { error: `Insufficient tren fund transfer: ${devAmount} < ${BURN_HALF}` },
        { status: 400 },
      );
    }

    const from = ('0x' + (devLog.topics[1]?.slice(26) || '')) as `0x${string}`;
    if (from.toLowerCase() !== burnerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Tren fund transfer sender mismatch' }, { status: 400 });
    }
  } catch (err) {
    console.error('[x402] Tren fund verification failed:', err);
    return NextResponse.json(
      { error: 'Failed to verify tren fund transfer on-chain. Is the tx confirmed?' },
      { status: 502 },
    );
  }

  // ── Settle x402 payment via Meridian ───────────────────
  const paymentRequirements = buildPaymentRequirements(
    'https://megachad.xyz/api/x402/looksmaxx',
    'Looksmaxx infra fee',
    LOOKSMAXX_INFRA_FEE,
  );

  const settlement = await settlePayment(paymentPayload, paymentRequirements);
  if (!settlement.success) {
    console.error('[x402] Meridian settlement failed:', settlement.error);
    return NextResponse.json(
      { error: `Payment settlement failed: ${settlement.error}` },
      { status: 402 },
    );
  }

  console.log('[x402] Payment settled successfully');

  // ── Generate image ────────────────────────────────────
  const dataUri = `data:${mimeType};base64,${image}`;
  const replicate = new Replicate({ auth: replicateToken });
  let imageUrl: string;

  const looksmaxxPrompt = 'Professional black and white portrait photography, subtle chiseled jawline enhancement, gentle cheekbone definition, maintain smooth youthful skin, keep original face and eye structure exactly as shown, CRITICAL: BOTH eyes MUST have bright glowing pink-purple light (#FF8AA8, #F786C6) emanating from pupils, laser eyes meme style with glowing aura around both eyes, REQUIRED: single thin horizontal laser beam passing through BOTH eyes, clean straight laser line crossing both eyes, dramatic side lighting, dark charcoal background (#19191A), heavy film grain texture, 1:1 square composition, preserve original eye shape and details completely, keep the same face hair and clothes';

  const negativePrompt = '3D render, one eye glowing, single eye laser, no laser beam, no eye glow, dim eyes, replace eyes, change eye shape, different eye structure, distorted eyes, solid glowing orbs replacing eyes, no eye details, warped pupils, thick laser beams, curved lasers, diagonal lasers, blurry lasers, messy light rays, wrinkled skin, aged face, excessive detail, deep wrinkles, extreme facial changes, different face, change hair, change clothes, cartoon, smooth plastic, baby face, soft jaw, weak jawline, round face, puffy cheeks, asymmetric eyes, small text, script font, serif font, cursive text';

  try {
    const output = await replicate.run(
      'black-forest-labs/flux-2-max' as `${string}/${string}`,
      {
        input: {
          prompt: looksmaxxPrompt,
          negative_prompt: negativePrompt,
          input_images: [dataUri],
          aspect_ratio: '1:1',
        },
      },
    );
    imageUrl = Array.isArray(output) ? output[0] : (output as unknown as string);
    if (typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Unexpected Replicate output' }, { status: 500 });
    }
  } catch (err) {
    console.error('[x402] Replicate error:', err);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 502 });
  }

  // ── Pin image to IPFS ──────────────────────────────────
  let ipfsCid = '';
  let ipfsUrl = '';

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to download generated image');
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const pinResult = await pinImage(imgBuffer, {
      burner: burnerAddress,
      prompt: 'looksmaxx',
      txHash: burnTxHash,
    });

    ipfsCid = pinResult.cid;
    ipfsUrl = pinResult.url;
  } catch (err) {
    console.error('[x402] IPFS pinning failed:', err);
    return NextResponse.json({
      imageUrl,
      ipfsCid: null,
      ipfsUrl: null,
      warning: 'Image generated but IPFS pinning failed',
    });
  }

  // ── Get sequential number for NFT name ─────────────────
  let mintNumber = 1;
  try {
    const { Redis } = await import('@upstash/redis');
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (redisUrl && redisToken) {
      const r = new Redis({ url: redisUrl, token: redisToken });
      const count = await r.zcard('burn:gallery');
      mintNumber = count;
    }
  } catch {
    // fallback
  }

  // ── Pin NFT metadata to IPFS ───────────────────────────
  const paddedNumber = String(mintNumber).padStart(4, '0');
  let metadataUrl = '';
  try {
    const metaResult = await pinMetadata({
      name: `$MEGACHAD ${paddedNumber}`,
      description: `Looksmaxxed by ${burnerAddress} via x402 agent. Burn tx: ${burnTxHash}`,
      imageCid: ipfsCid,
      attributes: [
        { trait_type: 'Burner', value: burnerAddress },
        { trait_type: 'Burn Tx', value: burnTxHash },
        { trait_type: 'Dev Tx', value: devTxHash },
        { trait_type: 'Source', value: 'x402-agent' },
      ],
    });
    metadataUrl = metaResult.url;
  } catch (err) {
    console.error('[x402] NFT metadata pinning failed:', err);
  }

  // ── Mint NFT ───────────────────────────────────────────
  let tokenId: string | null = null;
  const walletClient = getMinterWalletClient();

  if (walletClient && metadataUrl && NFT_CONTRACT !== '0x0000000000000000000000000000000000000000') {
    try {
      const mintAbi = [
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

      const request = await walletClient.prepareTransactionRequest({
        account: walletClient.account!,
        to: NFT_CONTRACT,
        data: encodeFunctionData({
          abi: mintAbi,
          functionName: 'mint',
          args: [burnerAddress as `0x${string}`, metadataUrl],
        }),
      });

      const signedTx = await walletClient.signTransaction(request);

      const mintReceipt = (await viemClient.request({
        method: 'eth_sendRawTransactionSync' as any,
        params: [signedTx],
      })) as TransactionReceipt;

      if (mintReceipt?.logs) {
        const transferLog = mintReceipt.logs.find((log) => {
          return log.address.toLowerCase() === NFT_CONTRACT.toLowerCase() && log.topics.length >= 4;
        });
        if (transferLog?.topics[3]) {
          tokenId = BigInt(transferLog.topics[3]).toString();
        }
      }
    } catch (err) {
      console.error('[x402] NFT minting failed:', err);
    }
  }

  // ── Store in Redis ─────────────────────────────────────
  try {
    await markTxUsed({
      txHash: burnTxHash,
      burner: burnerAddress,
      prompt: 'looksmaxx',
      cid: ipfsCid,
      ipfsUrl,
      timestamp: new Date().toISOString(),
      burnAmount: Number(BURN_HALF / 10n ** 18n),
      tokenId: tokenId || undefined,
    });
  } catch {
    console.warn('[x402] Redis store failed — image was still generated and pinned');
  }

  return NextResponse.json({
    success: true,
    source: 'x402-agent',
    imageUrl,
    ipfsCid,
    ipfsUrl,
    tokenId,
    burnTxHash,
    devTxHash,
  });
}
