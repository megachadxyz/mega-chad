// Shared helpers for the /api/defi/* agent surface.
//
// Agents call these endpoints to read protocol state and get back ready-to-sign
// calldata for stake / unstake / claim / swap / vote / propose. Everything that
// needs an RPC read happens here; the route handlers stay thin.

import { createPublicClient, encodeFunctionData, http, type Address } from 'viem';
import { megaeth } from './wagmi';
import {
  MAINNET_MEGACHAD_ADDRESS,
  MAINNET_MEGAGOONER_ADDRESS,
  MAINNET_MC_MG_PAIR_ADDRESS,
  MAINNET_MOGGER_STAKING_ADDRESS,
  MAINNET_JESTERGOONER_ADDRESS,
  MAINNET_JESTERMOGGER_ADDRESS,
  MAINNET_NFT_VETO_COUNCIL_ADDRESS,
  MAINNET_EMISSION_CONTROLLER_ADDRESS,
  MAINNET_FRAMEMOGGER_ADDRESS,
  MAINNET_CIRCUIT_BREAKER_ADDRESS,
  MAINNET_NFT_ADDRESS,
  MOGGER_STAKING_ABI,
  MAINNET_JESTERGOONER_V3_ABI,
} from './mainnet-contracts';
import {
  ERC20_ABI,
  LP_ABI,
  JESTERMOGGER_ABI,
  NFT_VETO_COUNCIL_ABI,
  FRAMEMOGGER_ABI,
  MEGAGOONER_ABI,
  PROPOSAL_STATES,
} from './testnet-contracts';

export const client = createPublicClient({
  chain: megaeth,
  transport: http(),
});

export const ADDRESSES = {
  MEGACHAD: MAINNET_MEGACHAD_ADDRESS,
  MEGAGOONER: MAINNET_MEGAGOONER_ADDRESS,
  MC_MG_PAIR: MAINNET_MC_MG_PAIR_ADDRESS,
  MOGGER_STAKING: MAINNET_MOGGER_STAKING_ADDRESS,
  JESTERGOONER: MAINNET_JESTERGOONER_ADDRESS,
  JESTERMOGGER: MAINNET_JESTERMOGGER_ADDRESS,
  NFT_VETO_COUNCIL: MAINNET_NFT_VETO_COUNCIL_ADDRESS,
  EMISSION_CONTROLLER: MAINNET_EMISSION_CONTROLLER_ADDRESS,
  FRAMEMOGGER: MAINNET_FRAMEMOGGER_ADDRESS,
  CIRCUIT_BREAKER: MAINNET_CIRCUIT_BREAKER_ADDRESS,
  NFT: MAINNET_NFT_ADDRESS,
} as const;

export const ABIS = {
  ERC20: ERC20_ABI,
  LP: LP_ABI,
  MOGGER_STAKING: MOGGER_STAKING_ABI,
  JESTERGOONER: MAINNET_JESTERGOONER_V3_ABI,
  JESTERMOGGER: JESTERMOGGER_ABI,
  NFT_VETO_COUNCIL: NFT_VETO_COUNCIL_ABI,
  FRAMEMOGGER: FRAMEMOGGER_ABI,
  MEGAGOONER: MEGAGOONER_ABI,
} as const;

// EmissionController ABI — minimal subset for read endpoints.
export const EMISSION_CONTROLLER_ABI = [
  { type: 'function', name: 'getCurrentWeek', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getWeeklyEmission', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'genesisTimestamp', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'moggerSplitBps', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'jesterSplitBps', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'treasurySplitBps', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'lastDistributionWeek', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'distributeWeekly', inputs: [], outputs: [], stateMutability: 'nonpayable' },
] as const;

// Parse "1.5" / "1500" / wei-string → bigint at 18 decimals.
export function parseAmount(input: string): bigint {
  const s = input.trim();
  if (!s) throw new Error('amount required');
  if (s.includes('.') || !/^\d{10,}$/.test(s)) {
    const [whole, frac = ''] = s.split('.');
    const cleanWhole = (whole || '0').replace(/[^\d]/g, '');
    const cleanFrac = frac.replace(/[^\d]/g, '').padEnd(18, '0').slice(0, 18);
    return BigInt(cleanWhole) * 10n ** 18n + BigInt(cleanFrac);
  }
  return BigInt(s);
}

export function isAddress(s: unknown): s is Address {
  return typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s);
}

// Standard chain block agents echo back in responses.
export const CHAIN_BLOCK = {
  name: 'MegaETH',
  chainId: 4326,
  rpc: 'https://mainnet.megaeth.com/rpc',
};

// Build an ERC20.approve action.
export function buildApprove(token: Address, spender: Address, amount: bigint) {
  return {
    to: token,
    value: '0',
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    }),
    functionName: 'approve',
    args: { spender, amount: amount.toString() },
  };
}

export function buildERC20Transfer(token: Address, to: Address, amount: bigint) {
  return {
    to: token,
    value: '0',
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amount],
    }),
    functionName: 'transfer',
    args: { to, amount: amount.toString() },
  };
}

// Constant-product getAmountOut with 0.3% fee — matches MegaChadLP.swap math.
export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n) throw new Error('amountIn must be positive');
  if (reserveIn <= 0n || reserveOut <= 0n) throw new Error('insufficient liquidity');
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

// JSON.stringify-safe — converts bigints to strings.
export function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}

export { PROPOSAL_STATES };
