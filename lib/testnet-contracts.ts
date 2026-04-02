// ── Testnet contract addresses (deployed on MegaETH testnet, chain 6343) ──

export const TESTNET_MEGACHAD_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_MEGACHAD_CONTRACT ||
  '0x4Fb3d34e1fd1a7a905689CD841487623cdbc8a90') as `0x${string}`;

export const TESTNET_MEGAGOONER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_MEGAGOONER_CONTRACT ||
  '0xDa2A1Bb2AE894A381ff1946f115E29335eDCA577') as `0x${string}`;

export const TESTNET_FRAMEMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_FRAMEMOGGER_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const TESTNET_MOGGER_STAKING_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_MOGGER_STAKING_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const TESTNET_JESTERGOONER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_JESTERGOONER_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const TESTNET_JESTERMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_JESTERMOGGER_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

// MEGACHAD/MEGAGOONER LP token (for JESTERGOONER staking)
export const TESTNET_LP_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TESTNET_LP_TOKEN_CONTRACT ||
  '0xE150698cCcce99e0385146A70E0E150b4A2ebC70') as `0x${string}`;

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
  { type: 'function', name: 'burnMEGACHAD', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'BURN_RATIO', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'MIN_BURN_AMOUNT', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'WEEK_DURATION', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'megachad', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'megagooner', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'treasury', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'genesisTimestamp', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCurrentWeek', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'canPropose', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getBurnRequirements', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ name: 'megachadRequired', type: 'uint256' }, { name: 'megagoonerRequired', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCurrentTop3', inputs: [], outputs: [{ name: 'burners', type: 'address[3]' }, { name: 'amounts', type: 'uint256[3]' }], stateMutability: 'view' },
  { type: 'function', name: 'getCurrentWeekInfo', inputs: [], outputs: [{ name: 'week', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'totalBurned', type: 'uint256' }, { name: 'uniqueBurners', type: 'uint256' }, { name: 'topBurners', type: 'address[3]' }, { name: 'topAmounts', type: 'uint256[3]' }], stateMutability: 'view' },
  { type: 'function', name: 'getUserWeeklyBurns', inputs: [{ name: 'week', type: 'uint256' }, { name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getWeekStats', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: 'totalBurned', type: 'uint256' }, { name: 'uniqueBurners', type: 'uint256' }, { name: 'timeUntilEnd', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getWeekTop3', inputs: [{ name: 'week', type: 'uint256' }], outputs: [{ name: 'burners', type: 'address[3]' }, { name: 'amounts', type: 'uint256[3]' }], stateMutability: 'view' },
  { type: 'event', name: 'MEGACHADBurned', inputs: [{ name: 'burner', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'week', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'NewWeekStarted', inputs: [{ name: 'week', type: 'uint256', indexed: true }, { name: 'startTime', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'TopBurnersUpdated', inputs: [{ name: 'week', type: 'uint256', indexed: true }, { name: 'topBurners', type: 'address[3]', indexed: false }, { name: 'amounts', type: 'uint256[3]', indexed: false }] },
] as const;

// ── MoggerStaking ABI (stake MEGACHAD → earn MEGAGOONER) ──
export const MOGGER_STAKING_ABI = [
  { type: 'function', name: 'stake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unstake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'emergencyWithdraw', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'totalStaked', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'rewardPerToken', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getNFTMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakerInfo', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'stakedAmount', type: 'uint256' }, { name: 'earnedRewards', type: 'uint256' }, { name: 'nftCount', type: 'uint256' }, { name: 'multiplier', type: 'uint256' }, { name: 'effectiveStake', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getGlobalStats', inputs: [], outputs: [{ name: '_totalStaked', type: 'uint256' }, { name: '_totalRewardsDistributed', type: 'uint256' }, { name: '_rewardRate', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'Staked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardsClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
] as const;

// ── JESTERGOONER ABI (stake LP → earn MEGAGOONER) ──
export const JESTERGOONER_ABI = [
  { type: 'function', name: 'stake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unstake', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'emergencyWithdraw', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'MIN_LOCK_DURATION', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalStaked', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'rewardPerToken', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'canUnstake', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'earned', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getNFTMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTimeMultiplier', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakerInfo', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'stakedAmount', type: 'uint256' }, { name: 'earnedRewards', type: 'uint256' }, { name: 'lockEnd', type: 'uint256' }, { name: 'nftCount', type: 'uint256' }, { name: 'nftMultiplier', type: 'uint256' }, { name: 'timeMultiplier', type: 'uint256' }, { name: 'effectiveStake', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getGlobalStats', inputs: [], outputs: [{ name: '_totalStaked', type: 'uint256' }, { name: '_totalRewardsDistributed', type: 'uint256' }, { name: '_rewardRate', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'Staked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'lockUntil', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Unstaked', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RewardsClaimed', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
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
