import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { createPublicClient, createWalletClient, encodeFunctionData, http, type TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { pinImage, pinMetadata } from '@/lib/pinata';
import { isTxUsed, markTxUsed } from '@/lib/redis';
import { megaeth } from '@/lib/wagmi';

export const maxDuration = 120;

const MEGACHAD_CONTRACT = (process.env.NEXT_PUBLIC_MEGACHAD_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const BURN_AMOUNT = BigInt(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') * 10n ** 18n;
const BURN_HALF = BURN_AMOUNT / 2n;

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;
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

export async function POST(req: NextRequest) {
  // ── Validate env ──────────────────────────────────────
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not set' }, { status: 500 });
  }

  // ── Parse FormData ──────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const burnTxHash = formData.get('burnTxHash') as string | null;
  const devTxHash = formData.get('devTxHash') as string | null;
  const burnerAddress = formData.get('burnerAddress') as string | null;
  const imageFile = formData.get('image') as File | null;

  if (!burnTxHash || !burnTxHash.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing or invalid burnTxHash' }, { status: 400 });
  }
  if (!devTxHash || !devTxHash.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing or invalid devTxHash' }, { status: 400 });
  }
  if (!burnerAddress) {
    return NextResponse.json({ error: 'Missing burnerAddress' }, { status: 400 });
  }
  if (!imageFile || !(imageFile instanceof File)) {
    return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(imageFile.type)) {
    return NextResponse.json({ error: 'Image must be JPEG, PNG, or WebP' }, { status: 400 });
  }
  if (imageFile.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 4MB' }, { status: 400 });
  }

  // Convert uploaded image to data URI for Replicate
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  const dataUri = `data:${imageFile.type};base64,${imageBuffer.toString('base64')}`;

  // ── Check replay ──────────────────────────────────────
  try {
    if (await isTxUsed(burnTxHash)) {
      return NextResponse.json({ error: 'This burn transaction has already been used' }, { status: 409 });
    }
  } catch {
    // Redis not configured — skip replay check in dev
    console.warn('Redis not available — skipping replay check');
  }

  // ── Verify burn transfer on-chain ──────────────────────
  try {
    const burnReceipt = await viemClient.getTransactionReceipt({
      hash: burnTxHash as `0x${string}`,
    });

    if (burnReceipt.status !== 'success') {
      return NextResponse.json({ error: 'Burn transaction failed on-chain' }, { status: 400 });
    }

    // Find Transfer event to 0x...dEaD (burn) from our contract
    const burnLog = burnReceipt.logs.find((log) => {
      if (log.address.toLowerCase() !== MEGACHAD_CONTRACT.toLowerCase()) return false;
      if (log.topics.length < 3) return false;
      const to = ('0x' + (log.topics[2]?.slice(26) || '')) as `0x${string}`;
      return to.toLowerCase() === BURN_ADDRESS.toLowerCase();
    });

    if (!burnLog) {
      return NextResponse.json(
        { error: 'No burn transfer event found in this transaction' },
        { status: 400 }
      );
    }

    const burnedAmount = BigInt(burnLog.data);
    if (burnedAmount < BURN_HALF) {
      return NextResponse.json(
        { error: `Insufficient burn: ${burnedAmount} < ${BURN_HALF}` },
        { status: 400 }
      );
    }

    const from = ('0x' + (burnLog.topics[1]?.slice(26) || '')) as `0x${string}`;
    if (from.toLowerCase() !== burnerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Burner address mismatch' }, { status: 400 });
    }
  } catch (err) {
    console.error('Burn verification failed:', err);
    return NextResponse.json(
      { error: 'Failed to verify burn on-chain. Is the tx confirmed?' },
      { status: 502 }
    );
  }

  // ── Verify dev wallet transfer on-chain ────────────────
  try {
    const devReceipt = await viemClient.getTransactionReceipt({
      hash: devTxHash as `0x${string}`,
    });

    if (devReceipt.status !== 'success') {
      return NextResponse.json({ error: 'Dev wallet transfer failed on-chain' }, { status: 400 });
    }

    const devLog = devReceipt.logs.find((log) => {
      if (log.address.toLowerCase() !== MEGACHAD_CONTRACT.toLowerCase()) return false;
      if (log.topics.length < 3) return false;
      const to = ('0x' + (log.topics[2]?.slice(26) || '')) as `0x${string}`;
      return to.toLowerCase() === TREN_FUND_WALLET.toLowerCase();
    });

    if (!devLog) {
      return NextResponse.json(
        { error: 'No dev wallet transfer event found in this transaction' },
        { status: 400 }
      );
    }

    const devAmount = BigInt(devLog.data);
    if (devAmount < BURN_HALF) {
      return NextResponse.json(
        { error: `Insufficient dev transfer: ${devAmount} < ${BURN_HALF}` },
        { status: 400 }
      );
    }

    const from = ('0x' + (devLog.topics[1]?.slice(26) || '')) as `0x${string}`;
    if (from.toLowerCase() !== burnerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Dev transfer sender mismatch' }, { status: 400 });
    }
  } catch (err) {
    console.error('Dev transfer verification failed:', err);
    return NextResponse.json(
      { error: 'Failed to verify dev transfer on-chain. Is the tx confirmed?' },
      { status: 502 }
    );
  }

  // ── Generate image ────────────────────────────────────
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
    console.error('IPFS pinning failed:', err);
    return NextResponse.json({
      imageUrl,
      ipfsCid: null,
      ipfsUrl: null,
      warning: 'Image generated but IPFS pinning failed',
    });
  }

  // ── Get sequential number for NFT name ──────────────────
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
    // fallback to 1
  }

  // ── Pin NFT metadata to IPFS ───────────────────────────
  const paddedNumber = String(mintNumber).padStart(4, '0');
  let metadataUrl = '';
  try {
    const metaResult = await pinMetadata({
      name: `$MEGACHAD ${paddedNumber}`,
      description: `Looksmaxxed by ${burnerAddress}. Burn tx: ${burnTxHash}`,
      imageCid: ipfsCid,
      attributes: [
        { trait_type: 'Burner', value: burnerAddress },
        { trait_type: 'Burn Tx', value: burnTxHash },
        { trait_type: 'Dev Tx', value: devTxHash },
      ],
    });
    metadataUrl = metaResult.url;
  } catch (err) {
    console.error('NFT metadata pinning failed:', err);
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

      // Prepare transaction request
      const request = await walletClient.prepareTransactionRequest({
        account: walletClient.account!,
        to: NFT_CONTRACT,
        data: encodeFunctionData({
          abi: mintAbi,
          functionName: 'mint',
          args: [burnerAddress as `0x${string}`, metadataUrl],
        }),
      });

      // Sign the transaction
      const signedTx = await walletClient.signTransaction(request);

      // Use EIP-7966 eth_sendRawTransactionSync for instant receipt
      const mintReceipt = (await viemClient.request({
        method: 'eth_sendRawTransactionSync' as any,
        params: [signedTx],
      })) as TransactionReceipt;

      // Parse tokenId from Transfer event (ERC-721 Transfer has tokenId in topics[3])
      if (mintReceipt?.logs) {
        const transferLog = mintReceipt.logs.find((log) => {
          return log.address.toLowerCase() === NFT_CONTRACT.toLowerCase() && log.topics.length >= 4;
        });
        if (transferLog?.topics[3]) {
          tokenId = BigInt(transferLog.topics[3]).toString();
        }
      }
    } catch (err) {
      console.error('NFT minting failed:', err);
    }
  }

  // ── Store in Redis ────────────────────────────────────
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
    console.warn('Redis store failed — image was still generated and pinned');
  }

  return NextResponse.json({
    imageUrl,
    ipfsCid,
    ipfsUrl,
    tokenId,
  });
}
