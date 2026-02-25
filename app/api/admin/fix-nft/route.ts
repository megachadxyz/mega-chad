import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const IMAGE_CID = 'bafkreig5yyian4rasr3pcrw56wys2zqpejxwuv72oezd4vlsz272lioahy';
const TOKEN_ID = '10';
const BURNER = '0x85bf9272DEA7dff1781F71473187b96c6f2f370C';
const BURN_TX = '0x6397e65c7503df9c1e6a96ca095482f71c0ad0773f85d41cb4d02ae3b2b5949a';
const DEV_TX = '0xd59b70ac5b8ed94af4242cc5a033208e8650a02215ec36dfb2e593b09d1afe73';
const TIMESTAMP = '2026-02-24T21:14:26.102Z';

export async function GET(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!jwt || !upstashUrl || !upstashToken) {
    return NextResponse.json({ error: 'Missing env vars', hasJwt: !!jwt, hasUpstash: !!upstashUrl }, { status: 500 });
  }

  const results: Record<string, unknown> = {};

  // 1. Pin image CID by hash
  try {
    const pinRes = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hashToPin: IMAGE_CID,
        pinataMetadata: { name: `megachad-nft-${TOKEN_ID}-image`, keyvalues: { tokenId: TOKEN_ID, burner: BURNER } },
      }),
    });
    results.pinImage = { status: pinRes.status, body: await pinRes.json() };
  } catch (e: any) {
    results.pinImage = { error: e.message };
  }

  // 2. Pin metadata JSON
  let metadataCid = '';
  try {
    const metadataJson = {
      name: `$MEGACHAD ${TOKEN_ID.padStart(4, '0')}`,
      description: `Looksmaxxed by ${BURNER}. Burn tx: ${BURN_TX}`,
      image: `ipfs://${IMAGE_CID}`,
      attributes: [
        { trait_type: 'Burner', value: BURNER },
        { trait_type: 'Burn Tx', value: BURN_TX },
        { trait_type: 'Dev Tx', value: DEV_TX },
        { trait_type: 'Timestamp', value: TIMESTAMP },
      ],
    };

    const formData = new FormData();
    formData.append('file', new Blob([JSON.stringify(metadataJson)], { type: 'application/json' }), 'metadata.json');
    formData.append('pinataMetadata', JSON.stringify({ name: `megachad-nft-${TOKEN_ID}-metadata` }));
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

    const uploadRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    metadataCid = uploadData.IpfsHash || '';
    results.pinMetadata = { status: uploadRes.status, body: uploadData };
  } catch (e: any) {
    results.pinMetadata = { error: e.message };
  }

  // 3. Update Redis entry
  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${IMAGE_CID}`;
  const metadataIpfsUrl = metadataCid ? `https://gateway.pinata.cloud/ipfs/${metadataCid}` : undefined;

  const metadata = {
    tokenId: TOKEN_ID,
    warrenTokenId: 215,
    ipfsUrl,
    ...(metadataIpfsUrl ? { metadataIpfsUrl } : {}),
    burner: BURNER,
    burnTxHash: BURN_TX,
    devTxHash: DEV_TX,
    timestamp: TIMESTAMP,
  };

  try {
    const redisRes = await fetch(upstashUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', `nft:metadata:${TOKEN_ID}`, JSON.stringify(metadata)]),
      cache: 'no-store',
    });
    results.updateRedis = { status: redisRes.status, body: await redisRes.json() };
  } catch (e: any) {
    results.updateRedis = { error: e.message };
  }

  results.ipfsUrl = ipfsUrl;
  results.metadataIpfsUrl = metadataIpfsUrl;

  return NextResponse.json(results);
}
