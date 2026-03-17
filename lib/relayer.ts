export const RELAYER_ADDRESS = (process.env.NEXT_PUBLIC_RELAYER_CONTRACT ||
  '0x87d67c0A351FeB2bB9F6985D55665544F94ebC9F') as `0x${string}`;

export const RELAYER_ABI = [
  {
    type: 'function',
    name: 'relayBurn',
    inputs: [
      { name: 'burner', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getNonce',
    inputs: [{ name: 'burner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: '', type: 'address' }],
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
    name: 'GaslessBurn',
    inputs: [
      { name: 'burner', type: 'address', indexed: true },
      { name: 'nonce', type: 'uint256', indexed: false },
      { name: 'burnAmount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const EIP712_DOMAIN = {
  name: 'MegaChadRelayer',
  version: '1',
  chainId: 4326,
  verifyingContract: RELAYER_ADDRESS,
} as const;

export const EIP712_TYPES = {
  BurnRequest: [
    { name: 'burner', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;
