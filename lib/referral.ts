export const REFERRAL_ADDRESS = (process.env.NEXT_PUBLIC_REFERRAL_CONTRACT ||
  '0xf85004d10AbA6200669FeB12C81d356027312181') as `0x${string}`;

export const REFERRAL_ABI = [
  {
    type: 'function',
    name: 'burnWithReferral',
    inputs: [{ name: 'referrer', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burn',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'registerAgent',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isAgent',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAgentStats',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      { name: 'count', type: 'uint256' },
      { name: 'earnings', type: 'uint256' },
      { name: 'registered', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'referralCount',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'referralEarnings',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'referralBps',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'burnAmount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'AgentRegistered',
    inputs: [{ name: 'agent', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'ReferralBurn',
    inputs: [
      { name: 'burner', type: 'address', indexed: true },
      { name: 'referrer', type: 'address', indexed: true },
      { name: 'burnedAmount', type: 'uint256', indexed: false },
      { name: 'trenAmount', type: 'uint256', indexed: false },
      { name: 'referralReward', type: 'uint256', indexed: false },
    ],
  },
] as const;
