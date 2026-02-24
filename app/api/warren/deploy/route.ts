import { NextRequest, NextResponse } from 'next/server';
import { deployToWarren } from '@/lib/warren';
import { storeNFTMetadata } from '@/lib/redis';
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

    // Mint NFT with our custom metadata endpoint
    const mintHash = await walletClient.writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'mint',
      args: [
        burnerAddress as `0x${string}`,
        `https://megachad.xyz/api/metadata/PLACEHOLDER`, // Will be updated with actual tokenId
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

    // Store NFT metadata in Redis for our custom metadata endpoint
    await storeNFTMetadata({
      tokenId,
      warrenTokenId: warrenResult.tokenId,
      ipfsUrl,
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
