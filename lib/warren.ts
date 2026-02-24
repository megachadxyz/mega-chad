/**
 * Warren Protocol API Client
 * For on-chain permanent image storage on MegaETH
 */

const WARREN_API_KEY = process.env.WARREN_API_KEY || 'mc_b52f876cfeb4ba6ab6d9314858fae9b93093fd705bd83e7c';
const WARREN_BASE_URL = 'https://thewarren.app';
const WARREN_REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756';

export interface WarrenEstimate {
  totalEth: string;
  totalWei: string;
  relayerAddress: string;
  chunkCount: number;
}

export interface WarrenDeployResult {
  success: boolean;
  tokenId: number;
  registryAddress: string;
  chunkCount: number;
  depth: number;
  size: number;
}

/**
 * Estimate gas cost for storing an image on-chain
 * @param imageSize - Size of image in bytes
 * @returns Gas estimate including relayer address
 */
export async function estimateWarrenFee(imageSize: number): Promise<WarrenEstimate> {
  const response = await fetch(`${WARREN_BASE_URL}/api/partner/estimate-fee`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Warren-Partner-Key': WARREN_API_KEY,
    },
    body: JSON.stringify({
      size: imageSize,
      type: 'image',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Warren estimate failed: ${error}`);
  }

  return response.json();
}

/**
 * Deploy image to Warren on-chain storage
 * @param imageBase64 - Base64 encoded image data
 * @param paymentTxHash - Transaction hash of ETH payment to relayer
 * @param senderAddress - Address that paid the gas
 * @returns Warren deployment result with tokenId
 */
export async function deployToWarren(
  imageBase64: string,
  paymentTxHash: string,
  senderAddress: string
): Promise<WarrenDeployResult> {
  const response = await fetch(`${WARREN_BASE_URL}/api/partner/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Warren-Partner-Key': WARREN_API_KEY,
    },
    body: JSON.stringify({
      data: imageBase64,
      siteType: 'image',
      paymentTxHash,
      senderAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Warren deploy failed: ${error}`);
  }

  return response.json();
}

/**
 * Get Warren on-chain image URL
 * @param warrenTokenId - Token ID from Warren deployment
 * @returns Direct URL to on-chain image
 */
export function getWarrenImageUrl(warrenTokenId: number): string {
  return `${WARREN_BASE_URL}/api/onchain-image/registry?registry=${WARREN_REGISTRY}&id=${warrenTokenId}`;
}

/**
 * Check deployment status
 * @param warrenTokenId - Token ID to check
 */
export async function getWarrenStatus(warrenTokenId: number): Promise<any> {
  const response = await fetch(`${WARREN_BASE_URL}/api/partner/status/${warrenTokenId}`, {
    headers: {
      'X-Warren-Partner-Key': WARREN_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Warren status check failed');
  }

  return response.json();
}
