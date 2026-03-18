import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { megaeth } from '@/lib/wagmi';
import {
  ERC8004_IDENTITY_REGISTRY,
  ERC8004_REPUTATION_REGISTRY,
  MEGACHAD_AGENT_REGISTRATION,
  AGENT_REGISTRY_URI,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
} from '@/lib/erc8004';
import { REFERRAL_ADDRESS } from '@/lib/referral';

export const dynamic = 'force-dynamic';

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

// Set via env when MegaChad is registered on-chain
const AGENT_ID = process.env.MEGACHAD_AGENT_ID
  ? BigInt(process.env.MEGACHAD_AGENT_ID)
  : null;

export async function GET() {
  try {
    const registration = { ...MEGACHAD_AGENT_REGISTRATION, registrations: [] as any[] };

    let onChainData: {
      agentId: string | null;
      agentURI: string | null;
      owner: string | null;
      wallet: string | null;
      reputationClients: number;
    } = {
      agentId: null,
      agentURI: null,
      owner: null,
      wallet: null,
      reputationClients: 0,
    };

    if (AGENT_ID !== null) {
      // Fetch on-chain identity data
      const [agentURI, owner, wallet, clients] = await Promise.allSettled([
        viemClient.readContract({
          address: ERC8004_IDENTITY_REGISTRY,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'tokenURI',
          args: [AGENT_ID],
        }),
        viemClient.readContract({
          address: ERC8004_IDENTITY_REGISTRY,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'ownerOf',
          args: [AGENT_ID],
        }),
        viemClient.readContract({
          address: ERC8004_IDENTITY_REGISTRY,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'getAgentWallet',
          args: [AGENT_ID],
        }),
        viemClient.readContract({
          address: ERC8004_REPUTATION_REGISTRY,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'getClients',
          args: [AGENT_ID],
        }),
      ]);

      onChainData = {
        agentId: AGENT_ID.toString(),
        agentURI: agentURI.status === 'fulfilled' ? agentURI.value : null,
        owner: owner.status === 'fulfilled' ? owner.value : null,
        wallet: wallet.status === 'fulfilled' ? wallet.value : null,
        reputationClients: clients.status === 'fulfilled' ? clients.value.length : 0,
      };

      registration.registrations = [
        {
          agentId: Number(AGENT_ID),
          agentRegistry: AGENT_REGISTRY_URI,
        },
      ];
    }

    return NextResponse.json({
      registration,
      onChain: onChainData,
      contracts: {
        identityRegistry: ERC8004_IDENTITY_REGISTRY,
        reputationRegistry: ERC8004_REPUTATION_REGISTRY,
      },
      status: AGENT_ID !== null ? 'registered' : 'pending_registration',
      referralProgram: {
        description: 'Agents can register on-chain to earn rewards for every burn they refer.',
        rewardPerBurn: '11,250 $MEGACHAD (5% of total 225,000 burn)',
        howToRegister: 'POST /api/agent/register with { wallet: "0x..." } to get registration calldata',
        checkStats: 'GET /api/agent/referrals?address=0x...',
        referralContract: REFERRAL_ADDRESS,
        flow: [
          '1. Register as agent via /api/agent/register',
          '2. Get your referral code',
          '3. Users burn with your referral via burnWithReferral(yourAddress)',
          '4. You earn 11,250 $MEGACHAD per referred burn automatically',
        ],
      },
    });
  } catch (err) {
    console.error('[Agent Info] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch agent info' },
      { status: 500 }
    );
  }
}
