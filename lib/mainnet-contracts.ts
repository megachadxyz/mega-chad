// ── Mainnet contract addresses (MegaETH mainnet, chain 4326) ──
//
// Most protocol contracts are not yet deployed. Sentinels of 0x0 are wired in
// so the UI can ship before deploy day. Each consuming component should call
// isContractDeployed(address) and render a "Launch pending" placeholder when
// the address is zero.

export const MAINNET_CHAIN_ID = 4326;

// ── Live (already deployed) ──
export const MAINNET_MEGACHAD_ADDRESS = (process.env.NEXT_PUBLIC_MEGACHAD_CONTRACT ||
  '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888') as `0x${string}`;

export const MAINNET_NFT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x1f1eFd3476b95091B9332b2d36a24bDE12CC6296') as `0x${string}`;

export const MAINNET_TREN_FUND_WALLET = (process.env.NEXT_PUBLIC_TREN_FUND_WALLET ||
  '0x85bf9272DEA7dff1781F71473187b96c6f2f370C') as `0x${string}`;

// ── Mainnet deploy (2026-05-16, deployer/admin/treasury = tren fund 0x85bf…370C) ──
const ZERO = '0x0000000000000000000000000000000000000000' as const;

export const MAINNET_MEGAGOONER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_MEGAGOONER_CONTRACT ||
  '0x11d819Dbd6e9aF0b13A54e88EA411155764e3F46') as `0x${string}`;

// V1/V2 staking sentinels (no migration on mainnet, always 0x0 — kept so UI imports resolve)
export const MAINNET_JESTERGOONER_V1_ADDRESS = ZERO as `0x${string}`;
export const MAINNET_JESTERGOONER_V2_ADDRESS = ZERO as `0x${string}`;
export const MAINNET_MOGGER_STAKING_V1_ADDRESS = ZERO as `0x${string}`;
export const MAINNET_FRAMEMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_FRAMEMOGGER_CONTRACT ||
  '0xce320179Fb66E088635f789881A939321682E0c5') as `0x${string}`;
export const MAINNET_MOGGER_STAKING_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_MOGGER_STAKING_CONTRACT ||
  '0xfd820E6189Eb3396dA71cB072643A0E1e1239853') as `0x${string}`;
export const MAINNET_JESTERGOONER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_JESTERGOONER_CONTRACT ||
  '0x2695965Dd283e2425fab5C4c1E0955656802569c') as `0x${string}`;
export const MAINNET_JESTERMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_JESTERMOGGER_CONTRACT ||
  '0x75C38E514Ba9FEeb6EEEeF4cdEb88074Ade0582b') as `0x${string}`;
export const MAINNET_NFT_VETO_COUNCIL_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_NFT_VETO_COUNCIL_CONTRACT ||
  '0xbE985E5159cDFE8d33b4E61644495B38cCb46468') as `0x${string}`;
export const MAINNET_EMISSION_CONTROLLER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_EMISSION_CONTROLLER_CONTRACT ||
  '0x9CBB09555395643abc016b586D7d890E6911a013') as `0x${string}`;
export const MAINNET_CIRCUIT_BREAKER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_CIRCUIT_BREAKER_CONTRACT ||
  '0x8C6c634D0B698de2E98713E5a02f7905b117beAE') as `0x${string}`;

// LP token — placeholder ERC20 (1B supply at tren fund). UI should keep JESTERGOONER staking
// gated as "pending DEX pair" until a real MEGACHAD/MEGAGOONER pool exists and lpToken is upgraded.
export const MAINNET_LP_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_LP_TOKEN_CONTRACT ||
  '0x5e0637a78A86Db804FdD03821864C501A482eA62') as `0x${string}`;

// Real MEGACHAD/MEGAGOONER AMM pair (Uniswap V2-equivalent x*y=k, 0.3% fee). Empty at deploy
// time — first depositor seeds initial reserves and mints sqrt(a*b) - 1000 LP shares. The
// UI calls addLiquidity here; JESTERGOONER staking continues to target the placeholder LP
// until V2.setLpToken() is called.
export const MAINNET_MC_MG_PAIR_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_MC_MG_PAIR_CONTRACT ||
  '0x437a433534FF6e7712D7e0A03Fa6CE577EeA1fef') as `0x${string}`;

export const MAINNET_LP_ETH_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_LP_ETH_CONTRACT || ZERO) as `0x${string}`;
export const MAINNET_LP_USDM_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_LP_USDM_CONTRACT || ZERO) as `0x${string}`;

// Real (non-mock) external assets on MegaETH mainnet
export const MAINNET_WETH_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_WETH_CONTRACT ||
  '0x4200000000000000000000000000000000000006') as `0x${string}`;

// REAL mUSD on MegaETH mainnet (NOT the testnet faucet mock)
export const MAINNET_USDM_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_USDM_CONTRACT ||
  '0xfafddbb3fc7688494971a79cc65dca3ef82079e7') as `0x${string}`;

export const MAINNET_BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;

export const MAINNET_BURN_AMOUNT = BigInt(
  process.env.NEXT_PUBLIC_BURN_AMOUNT || '225000'
) * 10n ** 18n;

export const MAINNET_BURN_AMOUNT_DISPLAY = Number(
  process.env.NEXT_PUBLIC_BURN_AMOUNT || '225000'
);

// Genesis airdrop to palantirthot (5% / 2.5M MEGAGOONER) — minted at MEGAGOONER.initialize()
export const PALANTIRTHOT_AIRDROP_RECIPIENT =
  '0xb622112a90E5cFc7fB7DB0fCe0158237c2A49750' as `0x${string}`;
export const PALANTIRTHOT_AIRDROP_AMOUNT = 2_500_000n * 10n ** 18n;

export function isContractDeployed(address: `0x${string}`): boolean {
  return address.toLowerCase() !== ZERO;
}

// Re-export ABIs that don't differ on mainnet. The JESTERGOONER multi-pool ABI
// imported from testnet does NOT match the deployed mainnet V3 (single-pool drip);
// consumers that import JESTERGOONER_V3_ABI from this module will silently get
// undefined reads on mainnet until they migrate to MAINNET_JESTERGOONER_V3_ABI below.
export {
  ERC20_ABI,
  MEGAGOONER_ABI,
  FRAMEMOGGER_ABI,
  JESTERGOONER_ABI,
  JESTERGOONER_V1_ABI,
  JESTERGOONER_V3_ABI,
  WETH_ABI,
  LP_ABI,
  JESTERMOGGER_ABI,
  NFT_VETO_COUNCIL_ABI,
  PROPOSAL_STATES,
  type ProposalState,
} from './testnet-contracts';

// ── Mainnet MoggerStaking ABI (V2 — Synthetix-style drip) ──
// Deployed MoggerStakingV2 returns:
//   getStakerInfo → (stakedAmount, earnedRewards, nftCount, multiplier, effectiveStake)
//   getGlobalStats → (totalStaked, totalRewardsDistributed, rewardRate)
// Drip getters (rewardRate, periodFinish, lastUpdateTime, REWARDS_DURATION) let
// the UI compute a continuous APR: rewardRate * SECONDS_PER_YEAR / totalEffectiveStake
// (in MEGAGOONER per effective-stake unit per year).
export const MOGGER_STAKING_ABI = [
  { type: 'function', name: 'stake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unstake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'distributeWeeklyRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'totalStaked', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalEffectiveStake', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getNFTMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'rewardPerToken', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'rewardRate', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'periodFinish', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'lastUpdateTime', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'lastTimeRewardApplicable', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'REWARDS_DURATION', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'bufferedRewards', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakerInfo', inputs: [{ name: 'account', type: 'address' }], outputs: [
    { name: 'stakedAmount', type: 'uint256' },
    { name: 'earnedRewards', type: 'uint256' },
    { name: 'nftCount', type: 'uint256' },
    { name: 'multiplier', type: 'uint256' },
    { name: 'effectiveStake', type: 'uint256' },
  ], stateMutability: 'view' },
  { type: 'function', name: 'getGlobalStats', inputs: [], outputs: [
    { name: '_totalStaked', type: 'uint256' },
    { name: '_totalRewardsDistributed', type: 'uint256' },
    { name: '_rewardRate', type: 'uint256' },
  ], stateMutability: 'view' },
  { type: 'event', name: 'Staked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardsClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'reward', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardRateUpdated', inputs: [{ name: 'rewardRate', type: 'uint256', indexed: false }, { name: 'periodFinish', type: 'uint256', indexed: false }] },
] as const;

// ── Mainnet JESTERGOONER V3 ABI (single-pool LP staking with Synthetix-style drip) ──
// The re-exported `JESTERGOONER_V3_ABI` from testnet describes a multi-pool contract
// that does NOT exist on mainnet — those reads return undefined at runtime. Use this
// ABI instead. Shape matches the actual deployed JESTERGOONER_V3.sol:
//   - single lpToken (one-shot setLpToken from PLACEHOLDER → real MC/MG pair)
//   - 4-week lock + time multiplier (50→100% over 4 weeks, weighted-avg timestamp)
//   - drip getters: rewardRate, periodFinish, lastUpdateTime, REWARDS_DURATION
//   - getStakerInfo returns 7-tuple: (stakedAmount, earnedRewards, lockEnd,
//     nftCount, nftMultiplier, timeMultiplier, effectiveStake)
//   - getGlobalStats returns 3-tuple: (totalStaked, totalRewardsDistributed, rewardRate)
export const MAINNET_JESTERGOONER_V3_ABI = [
  { type: 'function', name: 'lpToken', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'stake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unstake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'emergencyWithdraw', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'distributeWeeklyRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setLpToken', inputs: [{ name: 'newLpToken', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'totalStaked', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalEffectiveStake', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'canUnstake', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getNFTMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTimeMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'rewardPerToken', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'rewardRate', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'periodFinish', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'lastUpdateTime', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'lastTimeRewardApplicable', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'REWARDS_DURATION', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'MIN_LOCK_DURATION', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'PLACEHOLDER_LP', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'bufferedRewards', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakerInfo', inputs: [{ name: 'account', type: 'address' }], outputs: [
    { name: 'stakedAmount', type: 'uint256' },
    { name: 'earnedRewards', type: 'uint256' },
    { name: 'lockEnd', type: 'uint256' },
    { name: 'nftCount', type: 'uint256' },
    { name: 'nftMultiplier', type: 'uint256' },
    { name: 'timeMultiplier', type: 'uint256' },
    { name: 'effectiveStake', type: 'uint256' },
  ], stateMutability: 'view' },
  { type: 'function', name: 'getGlobalStats', inputs: [], outputs: [
    { name: '_totalStaked', type: 'uint256' },
    { name: '_totalRewardsDistributed', type: 'uint256' },
    { name: '_rewardRate', type: 'uint256' },
  ], stateMutability: 'view' },
  { type: 'event', name: 'Staked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'lockUntil', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardsClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardRateUpdated', inputs: [{ name: 'rewardRate', type: 'uint256', indexed: false }, { name: 'periodFinish', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'LpTokenSet', inputs: [{ name: 'previousLpToken', type: 'address', indexed: true }, { name: 'newLpToken', type: 'address', indexed: true }] },
] as const;
