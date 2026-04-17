// ── Testnet contract addresses (deployed on MegaETH testnet, chain 6343) ──

export const TESTNET_MEGACHAD_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_MEGACHAD_CONTRACT ||
  '0x4Fb3d34e1fd1a7a905689CD841487623cdbc8a90') as `0x${string}`;

export const TESTNET_MEGAGOONER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_MEGAGOONER_CONTRACT ||
  '0xDa2A1Bb2AE894A381ff1946f115E29335eDCA577') as `0x${string}`;

export const TESTNET_FRAMEMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_FRAMEMOGGER_CONTRACT ||
  '0x7e33c844751E49939365a23eeE31bDe9cbdA5F1e') as `0x${string}`;

// V1 addresses (deprecated — kept for migration UI)
export const TESTNET_MOGGER_STAKING_V1_ADDRESS = '0x98A585937641E304e48fFBB2c4B79e767Da0241D' as `0x${string}`;
export const TESTNET_JESTERGOONER_V1_ADDRESS = '0x2Ac6DF4FA8422a2bF3579ba9Dbed437376B00cA6' as `0x${string}`;

// V2 addresses (proportional emissions)
export const TESTNET_MOGGER_STAKING_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_MOGGER_STAKING_CONTRACT ||
  '0xc06A86687574a2612c2438299935c6033a8A132C') as `0x${string}`;

// V2 JesterGooner (deprecated — kept for migration)
export const TESTNET_JESTERGOONER_V2_ADDRESS = '0xa7E8839E5f2570E12148DDeA22b383a6bd15DaA8' as `0x${string}`;

// V3 JesterGooner (multi-pool LP staking)
export const TESTNET_JESTERGOONER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_JESTERGOONER_CONTRACT ||
  '0x10d5f83A3F97C9aCF62ed8Ceb05E57154323D95a') as `0x${string}`;

export const TESTNET_JESTERMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_JESTERMOGGER_CONTRACT ||
  '0x78546877Fe4079e5ca36A1c5C27a6F5ec23088c4') as `0x${string}`;

export const TESTNET_NFT_VETO_COUNCIL_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_NFT_VETO_COUNCIL_CONTRACT ||
  '0x0f3efB1D4E4f8Ec78eF7dd22c77Ec9DF8Bdc5Fe4') as `0x${string}`;

// LP tokens
export const TESTNET_LP_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_LP_TOKEN_CONTRACT ||
  '0xE150698cCcce99e0385146A70E0E150b4A2ebC70') as `0x${string}`; // MEGACHAD/MEGAGOONER

export const TESTNET_LP_ETH_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_LP_ETH_CONTRACT ||
  '0x09B2EA3257aB03fF11Fe7bB82C48bC5EBF85A224') as `0x${string}`; // MEGACHAD/WETH

export const TESTNET_LP_USDM_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_LP_USDM_CONTRACT ||
  '0x69709876fc50942F54e127F7cA5Ac422940De2FF') as `0x${string}`; // MEGACHAD/USDm

// WETH and USDm
export const TESTNET_WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as `0x${string}`;
export const TESTNET_USDM_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_USDM_CONTRACT ||
  '0x112410FcD45b4143D601e17843319d568eB9Fecb') as `0x${string}`;

export const TESTNET_NFT_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_NFT_CONTRACT ||
  '0x8Ba2A1f997FCae0486085E8Df521e28586f42255') as `0x${string}`;

export const TESTNET_BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;

export const TESTNET_TREN_FUND_WALLET = (process.env.NEXT_PUBLIC_TESTNET_TREN_FUND_WALLET ||
  '0x170db68DD5ef207FB060eEAbCE177a1DC9303ED8') as `0x${string}`;

export const TESTNET_BURN_AMOUNT = BigInt(
  process.env.NEXT_PUBLIC_TESTNET_BURN_AMOUNT || '225000'
) * 10n ** 18n;

export const TESTNET_BURN_AMOUNT_DISPLAY = Number(
  process.env.NEXT_PUBLIC_TESTNET_BURN_AMOUNT || '225000'
);

// ── ERC20 ABI (shared by MEGACHAD, MEGAGOONER, LP token) ──
export const ERC20_ABI = [
  { type: 'function', name: 'name', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSupply', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'transferFrom', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'event', name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Approval', inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'spender', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
] as const;

// ── MEGAGOONER extended ABI (ERC20 + snapshots + cap) ──
export const MEGAGOONER_ABI = [
  ...ERC20_ABI,
  { type: 'function', name: 'MAX_SUPPLY', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'remainingSupply', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'canMint', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOfAt', inputs: [{ name: 'account', type: 'address' }, { name: 'snapshotId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSupplyAt', inputs: [{ name: 'snapshotId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

// ── Framemogger ABI (burn MEGACHAD → mint MEGAGOONER) ──
export const FRAMEMOGGER_ABI = [
  // Matches deployed Framemogger.sol on testnet
  { type: 'function', name: 'sendMegachad', inputs: [{ name: 'megachadAmount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'MEGAGOONER_RATIO', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'WEEK_DURATION', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'megachad', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'megagooner', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'trenFund', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'genesisTimestamp', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCurrentWeek', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTimeRemaining', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'canPropose', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getBurnRequirements', inputs: [{ name: 'megachadAmount', type: 'uint256' }], outputs: [{ name: 'megagoonerNeeded', type: 'uint256' }], stateMutability: 'pure' },
  { type: 'function', name: 'getWeekTop3', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: '', type: 'address[3]' }, { name: '', type: 'uint256[3]' }], stateMutability: 'view' },
  { type: 'function', name: 'getWeekStats', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: 'totalSent', type: 'uint256' }, { name: 'uniqueSenders', type: 'uint256' }, { name: 'timeRemaining', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'weeklyUserSent', inputs: [{ name: 'week', type: 'uint256' }, { name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSentAllTime', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalMegagoonerBurned', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalUserSent', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'MegachadSent', inputs: [{ name: 'sender', type: 'address', indexed: true }, { name: 'megachadAmount', type: 'uint256', indexed: false }, { name: 'megagoonerBurned', type: 'uint256', indexed: false }, { name: 'week', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'TopBurnersUpdated', inputs: [{ name: 'week', type: 'uint256', indexed: true }, { name: 'top3', type: 'address[3]', indexed: false }, { name: 'amounts', type: 'uint256[3]', indexed: false }] },
] as const;

// ── MoggerStakingV2 ABI (stake MEGACHAD → earn MEGAGOONER, proportional emissions) ──
export const MOGGER_STAKING_ABI = [
  { type: 'function', name: 'stake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unstake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'refreshEffectiveStake', inputs: [{ name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'totalStaked', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalEffectiveStake', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getNFTMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCurrentWeek', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getWeeklyEmission', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakerInfo', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'staked', type: 'uint256' }, { name: 'effectiveStake', type: 'uint256' }, { name: 'pendingReward', type: 'uint256' }, { name: 'multiplier', type: 'uint256' }, { name: 'nftCount', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getGlobalStats', inputs: [], outputs: [{ name: '_totalStaked', type: 'uint256' }, { name: '_totalEffectiveStake', type: 'uint256' }, { name: 'currentWeek', type: 'uint256' }, { name: 'weeklyEmission', type: 'uint256' }, { name: 'rewardsRemaining', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'Staked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardsClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'reward', type: 'uint256', indexed: false }] },
] as const;

// ── JesterGoonerV2 ABI (stake LP → earn MEGAGOONER, proportional emissions + lock) ──
export const JESTERGOONER_ABI = [
  { type: 'function', name: 'stake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unstake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'refreshEffectiveStake', inputs: [{ name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'totalStaked', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalEffectiveStake', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getNFTMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCurrentWeek', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getWeeklyEmission', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakerInfo', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'staked', type: 'uint256' }, { name: 'effectiveStake', type: 'uint256' }, { name: 'pendingReward', type: 'uint256' }, { name: 'multiplier', type: 'uint256' }, { name: 'nftCount', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getGlobalStats', inputs: [], outputs: [{ name: '_totalStaked', type: 'uint256' }, { name: '_totalEffectiveStake', type: 'uint256' }, { name: 'currentWeek', type: 'uint256' }, { name: 'weeklyEmission', type: 'uint256' }, { name: 'rewardsRemaining', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'Staked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardsClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'reward', type: 'uint256', indexed: false }] },
] as const;

// ── JesterGooner V1 ABI (old contract with lock periods — for migration) ──
export const JESTERGOONER_V1_ABI = [
  { type: 'function', name: 'unstake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'totalStaked', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakerInfo', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'staked', type: 'uint256' }, { name: 'effectiveStake', type: 'uint256' }, { name: 'lockEnd', type: 'uint256' }, { name: 'pendingReward', type: 'uint256' }, { name: 'timeMultiplier', type: 'uint256' }, { name: 'nftMultiplier', type: 'uint256' }, { name: '_canUnstake', type: 'bool' }], stateMutability: 'view' },
] as const;

// ── JesterGoonerV3 ABI (multi-pool LP staking) ──
export const JESTERGOONER_V3_ABI = [
  { type: 'function', name: 'stake', inputs: [{ name: 'pid', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unstake', inputs: [{ name: 'pid', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [{ name: 'pid', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimAllRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'refreshEffectiveStake', inputs: [{ name: 'pid', type: 'uint256' }, { name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'poolLength', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalAllocPoint', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'pid', type: 'uint256' }, { name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earnedAll', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'total', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getNFTMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCurrentWeek', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getWeeklyEmission', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getPoolInfo', inputs: [{ name: 'pid', type: 'uint256' }], outputs: [{ name: 'lpToken', type: 'address' }, { name: 'allocPoint', type: 'uint256' }, { name: 'totalStaked', type: 'uint256' }, { name: 'totalEffectiveStake', type: 'uint256' }, { name: 'weeklyEmission', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getUserInfo', inputs: [{ name: 'pid', type: 'uint256' }, { name: 'account', type: 'address' }], outputs: [{ name: 'staked', type: 'uint256' }, { name: 'effectiveStake', type: 'uint256' }, { name: 'pendingReward', type: 'uint256' }, { name: 'multiplier', type: 'uint256' }, { name: 'nftCount', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getGlobalStats', inputs: [], outputs: [{ name: 'currentWeek', type: 'uint256' }, { name: 'totalWeeklyEmission', type: 'uint256' }, { name: 'rewardsRemaining', type: 'uint256' }, { name: 'numPools', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'Staked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'pid', type: 'uint256', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'pid', type: 'uint256', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardsClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'pid', type: 'uint256', indexed: true }, { name: 'reward', type: 'uint256', indexed: false }] },
] as const;

// ── WETH ABI (deposit/withdraw) ──
export const WETH_ABI = [
  { type: 'function', name: 'deposit', inputs: [], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'withdraw', inputs: [{ name: 'wad', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

// ── MockUSDm ABI (testnet faucet stablecoin) ──
export const MOCK_USDM_ABI = [
  ...ERC20_ABI,
  { type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

// ── MegaChadLP ABI (AMM + price/APY calculation) ──
export const LP_ABI = [
  { type: 'function', name: 'tokenA', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'tokenB', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'reserveA', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'reserveB', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getReserves', inputs: [], outputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSupply', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'addLiquidity', inputs: [{ name: 'amountA', type: 'uint256' }, { name: 'amountB', type: 'uint256' }, { name: 'to', type: 'address' }], outputs: [{ name: 'liquidity', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'removeLiquidity', inputs: [{ name: 'liquidity', type: 'uint256' }, { name: 'to', type: 'address' }], outputs: [{ name: 'amountA', type: 'uint256' }, { name: 'amountB', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'swap', inputs: [{ name: 'amountAIn', type: 'uint256' }, { name: 'amountBIn', type: 'uint256' }, { name: 'to', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

// ── Jestermogger ABI (governance) ──
export const JESTERMOGGER_ABI = [
  { type: 'function', name: 'propose', inputs: [{ name: 'targets', type: 'address[]' }, { name: 'values', type: 'uint256[]' }, { name: 'calldatas', type: 'bytes[]' }, { name: 'description', type: 'string' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'castVote', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'support', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'queue', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'execute', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'VOTING_DELAY', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'VOTING_PERIOD', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'TIMELOCK_PERIOD', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'GRACE_PERIOD', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'QUORUM_PERCENTAGE', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'proposalCount', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'state', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getProposal', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: 'proposer', type: 'address' }, { name: 'description', type: 'string' }, { name: 'forVotes', type: 'uint256' }, { name: 'againstVotes', type: 'uint256' }, { name: 'abstainVotes', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'eta', type: 'uint256' }, { name: 'executed', type: 'bool' }, { name: 'vetoed', type: 'bool' }, { name: 'currentState', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getActions', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: 'targets', type: 'address[]' }, { name: 'values', type: 'uint256[]' }, { name: 'calldatas', type: 'bytes[]' }], stateMutability: 'view' },
  { type: 'function', name: 'getReceipt', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'voter', type: 'address' }], outputs: [{ name: 'hasVoted', type: 'bool' }, { name: 'support', type: 'uint8' }, { name: 'votes', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'ProposalCreated', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'proposer', type: 'address', indexed: true }, { name: 'targets', type: 'address[]', indexed: false }, { name: 'values', type: 'uint256[]', indexed: false }, { name: 'description', type: 'string', indexed: false }, { name: 'startTime', type: 'uint256', indexed: false }, { name: 'endTime', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'VoteCast', inputs: [{ name: 'voter', type: 'address', indexed: true }, { name: 'proposalId', type: 'uint256', indexed: true }, { name: 'support', type: 'uint8', indexed: false }, { name: 'votes', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'ProposalQueued', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'eta', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'ProposalExecuted', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }] },
  { type: 'event', name: 'ProposalVetoed', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }] },
] as const;

// ── NFT Veto Council ABI ──
export const NFT_VETO_COUNCIL_ABI = [
  { type: 'function', name: 'COUNCIL_SIZE', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'VETO_THRESHOLD', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'VETO_VOTING_PERIOD', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCouncil', inputs: [], outputs: [{ name: '', type: 'address[20]' }], stateMutability: 'view' },
  { type: 'function', name: 'isCouncilMember', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getVetoVote', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'yesVotes', type: 'uint256' }, { name: 'noVotes', type: 'uint256' }, { name: 'executed', type: 'bool' }, { name: 'expired', type: 'bool' }, { name: 'canExecute', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'hasVotedOnVeto', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'voter', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'castVetoVote', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'support', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'startVetoVote', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'updateCouncil', inputs: [{ name: 'maxTokenId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'isVetoed', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'vetoWindowElapsed', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'event', name: 'CouncilUpdated', inputs: [{ name: 'newMembers', type: 'address[20]', indexed: false }] },
  { type: 'event', name: 'VetoVoteStarted', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'startTime', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'VetoCast', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'voter', type: 'address', indexed: true }, { name: 'support', type: 'bool', indexed: false }] },
  { type: 'event', name: 'VetoExecuted', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'yesVotes', type: 'uint256', indexed: false }, { name: 'noVotes', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'VetoFailed', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'yesVotes', type: 'uint256', indexed: false }, { name: 'noVotes', type: 'uint256', indexed: false }] },
] as const;

// ── NFT ABI (same as mainnet) ──
export const TESTNET_NFT_ABI = [
  { type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'tokenURI', type: 'string' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'tokenURI', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
] as const;

// ── Proposal state enum ──
export const PROPOSAL_STATES = [
  'Pending',
  'Active',
  'Defeated',
  'Succeeded',
  'Queued',
  'Executed',
  'Expired',
  'Vetoed',
] as const;

export type ProposalState = typeof PROPOSAL_STATES[number];
