import { PinataSDK } from 'pinata';

let pinata: PinataSDK | null = null;

function getPinata(): PinataSDK {
  if (!pinata) {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) throw new Error('PINATA_JWT not set');
    pinata = new PinataSDK({ pinataJwt: jwt });
  }
  return pinata;
}

export async function pinImage(
  imageBuffer: Buffer,
  metadata: {
    burner: string;
    prompt: string;
    txHash: string;
  }
): Promise<{ cid: string; url: string }> {
  const sdk = getPinata();

  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
  const file = new File([blob], `${metadata.txHash}.png`, {
    type: 'image/png',
  });

  const result = await sdk.upload.public.file(file, {
    metadata: {
      name: `burn-${metadata.txHash.slice(0, 10)}`,
      keyvalues: {
        burner: metadata.burner,
        prompt: metadata.prompt.slice(0, 200),
        txHash: metadata.txHash,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return {
    cid: result.cid,
    url: `https://gateway.pinata.cloud/ipfs/${result.cid}`,
  };
}

export async function pinMetadata(metadata: {
  name: string;
  description: string;
  imageCid: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}): Promise<{ cid: string; url: string }> {
  const sdk = getPinata();

  const json = {
    name: metadata.name,
    description: metadata.description,
    image: `ipfs://${metadata.imageCid}`,
    attributes: metadata.attributes || [],
  };

  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  const file = new File([blob], 'metadata.json', { type: 'application/json' });

  const result = await sdk.upload.public.file(file, {
    metadata: {
      name: `nft-metadata-${metadata.imageCid.slice(0, 10)}`,
    },
  });

  return {
    cid: result.cid,
    url: `https://gateway.pinata.cloud/ipfs/${result.cid}`,
  };
}
