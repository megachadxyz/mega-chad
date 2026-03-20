// MegaETH Social Identity Layer
// Aggregates on-chain data, MegaNames, burn history, and reputation into unified profiles

import { formatUnits } from 'viem';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI, BURN_ADDRESS, TREN_FUND_WALLET } from './contracts';
import { REFERRAL_ADDRESS, REFERRAL_ABI } from './referral';
import {
  ERC8004_IDENTITY_REGISTRY,
  ERC8004_REPUTATION_REGISTRY,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
} from './erc8004';
import { encodeFunctionData } from 'viem';

const MEGAETH_RPC = 'https://mainnet.megaeth.com/rpc';
const BASE = 'https://megachad.xyz';

// ── Types ──────────────────────────────────────────────────────

export interface MegaNameProfile {
  name?: string;
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  telegram?: string;
  url?: string;
}

export interface BurnRecord {
  txHash: string;
  timestamp: string;
  ipfsUrl?: string;
  tokenId?: string;
}

export interface ReputationData {
  score: number | null;
  count: number;
  clients: string[];
}

export interface ReferralData {
  isAgent: boolean;
  referralCount: number;
  totalEarnings: string;
  referralCode?: string;
}

export interface MegaChadIdentity {
  address: string;
  megaName?: MegaNameProfile;
  displayName: string;
  balances: {
    eth: string;
    megachad: string;
  };
  burns: {
    total: number;
    totalBurned: string;
    history: BurnRecord[];
    rank?: number;
  };
  nfts: {
    count: number;
    tokenIds: string[];
  };
  reputation: ReputationData;
  referral: ReferralData;
  tier: {
    level: number;
    name: string;
  };
  agentId?: number;
  createdAt?: string;
}

// ── RPC Helper ─────────────────────────────────────────────────

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(MEGAETH_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

async function multicall(calls: { to: string; data: string }[]): Promise<string[]> {
  const results = await Promise.all(
    calls.map(call => rpcCall('eth_call', [{ to: call.to, data: call.data }, 'latest']))
  );
  return results as string[];
}

// ── MegaNames Resolution ───────────────────────────────────────

// MegaNames registry on MegaETH
const MEGANAMES_REGISTRY = '0x2dA389bD4BB21c8F6a6c0407AcE3e87e7a0B65e1' as const;

const MEGANAMES_ABI = [
  {
    type: 'function',
    name: 'getName',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAddress',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProfile',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [
      { name: 'avatar', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'twitter', type: 'string' },
      { name: 'github', type: 'string' },
      { name: 'telegram', type: 'string' },
      { name: 'url', type: 'string' },
    ],
    stateMutability: 'view',
  },
] as const;

export async function resolveMegaName(addressOrName: string): Promise<{
  address: string;
  megaName?: MegaNameProfile;
}> {
  const isMegaName = addressOrName.endsWith('.mega') || (!addressOrName.startsWith('0x'));

  try {
    if (isMegaName) {
      // Resolve name → address
      const name = addressOrName.replace(/\.mega$/, '');
      const data = encodeFunctionData({
        abi: MEGANAMES_ABI,
        functionName: 'getAddress',
        args: [name],
      });
      const result = await rpcCall('eth_call', [{ to: MEGANAMES_REGISTRY, data }, 'latest']);
      const address = '0x' + (result as string).slice(26);

      if (address === '0x0000000000000000000000000000000000000000') {
        return { address: addressOrName };
      }

      const profile = await fetchMegaProfile(address);
      return { address, megaName: { name: `${name}.mega`, ...profile } };
    } else {
      // Resolve address → name
      const address = addressOrName;
      const profile = await fetchMegaProfile(address);

      // Try reverse resolve
      const nameData = encodeFunctionData({
        abi: MEGANAMES_ABI,
        functionName: 'getName',
        args: [address as `0x${string}`],
      });

      try {
        const nameResult = await rpcCall('eth_call', [{ to: MEGANAMES_REGISTRY, data: nameData }, 'latest']);
        const nameHex = nameResult as string;
        // Decode string from ABI encoding
        if (nameHex && nameHex !== '0x' && nameHex.length > 130) {
          const len = parseInt(nameHex.slice(130, 194), 16);
          if (len > 0 && len < 100) {
            const nameBytes = nameHex.slice(194, 194 + len * 2);
            const name = Buffer.from(nameBytes, 'hex').toString('utf8');
            if (name) {
              return { address, megaName: { name: `${name}.mega`, ...profile } };
            }
          }
        }
      } catch {
        // MegaNames contract may not exist yet, continue without name
      }

      return { address, megaName: profile ? { ...profile } : undefined };
    }
  } catch {
    // If resolution fails, return as-is
    return {
      address: isMegaName ? addressOrName : addressOrName,
      megaName: undefined,
    };
  }
}

async function fetchMegaProfile(address: string): Promise<Omit<MegaNameProfile, 'name'> | undefined> {
  try {
    const data = encodeFunctionData({
      abi: MEGANAMES_ABI,
      functionName: 'getProfile',
      args: [address as `0x${string}`],
    });
    const result = await rpcCall('eth_call', [{ to: MEGANAMES_REGISTRY, data }, 'latest']);
    const hex = result as string;

    if (!hex || hex === '0x' || hex.length < 200) return undefined;

    // ABI-decode the 6 string fields
    // Each field is an offset pointer, then length-prefixed string data
    // Simplified: try to decode, return undefined on failure
    return undefined; // Will be populated when MegaNames contract is deployed
  } catch {
    return undefined;
  }
}

// ── Tier Calculation ───────────────────────────────────────────

export function calculateTier(totalBurns: number): { level: number; name: string } {
  if (totalBurns >= 25) return { level: 5, name: 'Gigachad' };
  if (totalBurns >= 10) return { level: 4, name: 'Chad' };
  if (totalBurns >= 3) return { level: 3, name: 'Bonesmasher' };
  if (totalBurns >= 1) return { level: 2, name: 'Mewer' };
  return { level: 1, name: 'Normie' };
}

// ── Full Identity Resolution ───────────────────────────────────

export async function resolveIdentity(addressOrName: string): Promise<MegaChadIdentity> {
  // Step 1: Resolve address and MegaName
  const { address, megaName } = await resolveMegaName(addressOrName);

  // Step 2: Fetch on-chain data in parallel
  const [balances, burnData, referralData, reputationData] = await Promise.all([
    fetchBalances(address),
    fetchBurnHistory(address),
    fetchReferralData(address),
    fetchReputationData(address),
  ]);

  // Step 3: Calculate tier
  const tier = calculateTier(burnData.total);

  // Step 4: Build display name
  const displayName = megaName?.name || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return {
    address,
    megaName,
    displayName,
    balances,
    burns: burnData,
    nfts: { count: burnData.total, tokenIds: [] }, // NFTs correspond to burns
    reputation: reputationData,
    referral: referralData,
    tier,
  };
}

async function fetchBalances(address: string): Promise<{ eth: string; megachad: string }> {
  try {
    const balOfData = encodeFunctionData({
      abi: MEGACHAD_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    const [ethRaw, tokenRaw] = await Promise.all([
      rpcCall('eth_getBalance', [address, 'latest']),
      rpcCall('eth_call', [{ to: MEGACHAD_ADDRESS, data: balOfData }, 'latest']),
    ]);

    return {
      eth: formatUnits(BigInt(ethRaw as string || '0'), 18),
      megachad: formatUnits(BigInt(tokenRaw as string || '0'), 18),
    };
  } catch {
    return { eth: '0', megachad: '0' };
  }
}

async function fetchBurnHistory(address: string): Promise<{
  total: number;
  totalBurned: string;
  history: BurnRecord[];
  rank?: number;
}> {
  try {
    // Fetch from chadboard API (has aggregated burn data)
    const chadboardRes = await fetch(`${BASE}/api/chadboard`);
    const chadboard = await chadboardRes.json();

    const entries = chadboard.entries || [];
    const entry = entries.find(
      (e: { address: string }) => e.address.toLowerCase() === address.toLowerCase()
    );

    if (!entry) {
      return { total: 0, totalBurned: '0', history: [] };
    }

    const rank = entries.findIndex(
      (e: { address: string }) => e.address.toLowerCase() === address.toLowerCase()
    ) + 1;

    const history: BurnRecord[] = (entry.images || []).map((img: { txHash: string; timestamp: string; ipfsUrl: string }) => ({
      txHash: img.txHash,
      timestamp: img.timestamp,
      ipfsUrl: img.ipfsUrl,
    }));

    return {
      total: entry.totalBurns || 0,
      totalBurned: (entry.totalBurned || 0).toString(),
      history,
      rank: rank > 0 ? rank : undefined,
    };
  } catch {
    return { total: 0, totalBurned: '0', history: [] };
  }
}

async function fetchReferralData(address: string): Promise<ReferralData> {
  try {
    const isAgentData = encodeFunctionData({
      abi: REFERRAL_ABI,
      functionName: 'isAgent',
      args: [address as `0x${string}`],
    });

    const result = await rpcCall('eth_call', [{ to: REFERRAL_ADDRESS, data: isAgentData }, 'latest']);
    const isAgent = BigInt(result as string || '0') !== 0n;

    if (!isAgent) {
      return { isAgent: false, referralCount: 0, totalEarnings: '0' };
    }

    const statsData = encodeFunctionData({
      abi: REFERRAL_ABI,
      functionName: 'getAgentStats',
      args: [address as `0x${string}`],
    });

    const statsResult = await rpcCall('eth_call', [{ to: REFERRAL_ADDRESS, data: statsData }, 'latest']);
    const hex = statsResult as string;

    // Decode: (uint256 count, uint256 earnings, bool registered)
    const count = BigInt('0x' + hex.slice(2, 66));
    const earnings = BigInt('0x' + hex.slice(66, 130));

    // Generate referral code (base64url of address)
    const referralCode = Buffer.from(address.slice(2), 'hex')
      .toString('base64url')
      .slice(0, 12);

    return {
      isAgent: true,
      referralCount: Number(count),
      totalEarnings: formatUnits(earnings, 18),
      referralCode,
    };
  } catch {
    return { isAgent: false, referralCount: 0, totalEarnings: '0' };
  }
}

async function fetchReputationData(address: string): Promise<ReputationData> {
  const agentIdStr = process.env.MEGACHAD_AGENT_ID;
  if (!agentIdStr) return { score: null, count: 0, clients: [] };

  try {
    // Get clients who have rated
    const clientsData = encodeFunctionData({
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getClients',
      args: [BigInt(agentIdStr)],
    });

    const clientsResult = await rpcCall('eth_call', [
      { to: ERC8004_REPUTATION_REGISTRY, data: clientsData },
      'latest',
    ]);

    // Try to get summary
    const summaryData = encodeFunctionData({
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getSummary',
      args: [BigInt(agentIdStr), [], '', ''],
    });

    const summaryResult = await rpcCall('eth_call', [
      { to: ERC8004_REPUTATION_REGISTRY, data: summaryData },
      'latest',
    ]);

    const summaryHex = summaryResult as string;
    if (summaryHex && summaryHex.length >= 194) {
      const count = Number(BigInt('0x' + summaryHex.slice(2, 66)));
      const value = Number(BigInt('0x' + summaryHex.slice(66, 130)));

      return {
        score: count > 0 ? value : null,
        count,
        clients: [],
      };
    }

    return { score: null, count: 0, clients: [] };
  } catch {
    return { score: null, count: 0, clients: [] };
  }
}

// ── Batch Identity Resolution (for portal/leaderboard) ─────────

export async function resolveIdentities(addresses: string[]): Promise<MegaChadIdentity[]> {
  return Promise.all(addresses.map(addr => resolveIdentity(addr)));
}
