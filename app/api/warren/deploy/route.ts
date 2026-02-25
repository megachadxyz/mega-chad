import { NextRequest, NextResponse } from 'next/server';
import { deployToWarren } from '@/lib/warren';
import { storeNFTMetadata } from '@/lib/redis';
import { pinMetadata } from '@/lib/pinata';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaeth } from '@/lib/wagmi';

export const maxDuration = 120;

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

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

const NFT_ABI = [
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
  {
    type: 'function',
    name: '_nextTokenId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Deploy image to Warren and mint NFT
 * Called after user has paid Warren gas
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, paymentTxHash, burnerAddress, burnTxHash, devTxHash, ipfsUrl } = body;

    if (!imageBase64 || !paymentTxHash || !burnerAddress || !burnTxHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[Warren Deploy] Starting deployment for burner:', burnerAddress);

    // Deploy to Warren
    console.log('[Warren Deploy] Deploying to Warren...');
    const warrenResult = await deployToWarren(imageBase64, paymentTxHash, burnerAddress);

    console.log('[Warren Deploy] Success! Warren tokenId:', warrenResult.tokenId);

    // Mint NFT with custom metadata URL
    const walletClient = getMinterWalletClient();
    if (!walletClient || NFT_CONTRACT === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'NFT minting not configured' },
        { status: 500 }
      );
    }

    console.log('[Warren Deploy] Minting NFT...');

    // Get next tokenId before minting
    const nextTokenId = await viemClient.readContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: '_nextTokenId',
    });

    console.log('[Warren Deploy] Next tokenId will be:', nextTokenId.toString());

    // Mint NFT with correct metadata URL (using predicted tokenId)
    const mintHash = await walletClient.writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'mint',
      args: [
        burnerAddress as `0x${string}`,
        `https://megachad.xyz/api/metadata/${nextTokenId}`,
      ],
    });

    const mintReceipt = await viemClient.waitForTransactionReceipt({ hash: mintHash });

    // Parse tokenId from Transfer event
    const transferLog = mintReceipt.logs.find((log) => {
      return log.address.toLowerCase() === NFT_CONTRACT.toLowerCase() && log.topics.length >= 4;
    });

    let tokenId: string | null = null;
    if (transferLog?.topics[3]) {
      tokenId = BigInt(transferLog.topics[3]).toString();
    }

    if (!tokenId) {
      throw new Error('Failed to parse tokenId from mint receipt');
    }

    console.log('[Warren Deploy] NFT minted! TokenId:', tokenId);

    // Pin metadata JSON to IPFS as backup (non-fatal if it fails)
    let metadataIpfsUrl: string | undefined;
    try {
      const imageCid = ipfsUrl?.split('/ipfs/')[1];
      if (imageCid) {
        const metadataPin = await pinMetadata({
          name: `$MEGACHAD ${tokenId.padStart(4, '0')}`,
          description: `Looksmaxxed by ${burnerAddress}. Burn tx: ${burnTxHash}`,
          imageCid,
          attributes: [
            { trait_type: 'Burner', value: burnerAddress },
            { trait_type: 'Burn Tx', value: burnTxHash },
            ...(devTxHash ? [{ trait_type: 'Dev Tx', value: devTxHash }] : []),
          ],
        });
        metadataIpfsUrl = metadataPin.url;
        console.log('[Warren Deploy] Metadata pinned to IPFS:', metadataIpfsUrl);
      } else {
        console.warn('[Warren Deploy] No imageCid available, skipping metadata pin');
      }
    } catch (pinError) {
      console.error('[Warren Deploy] Failed to pin metadata to IPFS (non-fatal):', pinError);
    }

    // Store NFT metadata in Redis for our custom metadata endpoint
    await storeNFTMetadata({
      tokenId,
      warrenTokenId: warrenResult.tokenId,
      ipfsUrl,
      metadataIpfsUrl,
      burner: burnerAddress,
      burnTxHash,
      devTxHash,
      timestamp: new Date().toISOString(),
    });

    console.log('[Warren Deploy] Metadata stored in Redis');

    return NextResponse.json({
      success: true,
      tokenId,
      warrenTokenId: warrenResult.tokenId,
      warrenRegistry: warrenResult.registryAddress,
      mintTxHash: mintHash,
    });
  } catch (error) {
    console.error('[Warren Deploy] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Warren deployment failed',
      },
      { status: 500 }
    );
  }
}
