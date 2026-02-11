export const MEGACHAD_ADDRESS = (process.env.NEXT_PUBLIC_MEGACHAD_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const BURN_AMOUNT = BigInt(
  (process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000')
) * 10n ** 18n;

export const BURN_AMOUNT_DISPLAY = Number(
  process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000'
);

export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;

export const DEV_WALLET = (process.env.NEXT_PUBLIC_DEV_WALLET ||
  '0x85bf9272DEA7dff1781F71473187b96c6f2f370C') as `0x${string}`;

export const NFT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Minimal ERC20 ABI (standard transfer, no burnToCreate)
export const MEGACHAD_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ERC-721 NFT ABI (mint function)
export const NFT_ABI = [
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
