// ERC-8004 Trustless Agents — MegaETH Mainnet
// https://eips.ethereum.org/EIPS/eip-8004

export const ERC8004_IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;
export const ERC8004_REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

export const MEGAETH_CHAIN_ID = 4326;
export const MEGAETH_RPC = 'https://mainnet.megaeth.com/rpc';

// Agent global identifier format
export const AGENT_REGISTRY_URI = `eip155:${MEGAETH_CHAIN_ID}:${ERC8004_IDENTITY_REGISTRY}`;

// MegaChad agent registration metadata
export const MEGACHAD_AGENT_REGISTRATION = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'MegaChad',
  description: 'Burn-to-create looksmaxxing engine on MegaETH. Burn $MEGACHAD tokens to generate AI-enhanced portraits, mint NFTs, and earn on-chain reputation.',
  image: 'https://megachad.xyz/images/megachad-logo.png',
  openapi: 'https://megachad.xyz/.well-known/openapi.json',
  services: [
    {
      name: 'SwapQuote',
      endpoint: 'https://megachad.xyz/api/x402/quote',
      version: '1.0.0',
    },
    {
      name: 'Looksmaxx',
      endpoint: 'https://megachad.xyz/api/x402/looksmaxx',
      version: '1.0.0',
    },
    {
      name: 'BurnToCreate',
      endpoint: 'https://megachad.xyz/api/generate',
      version: '1.0.0',
    },
    {
      name: 'Chadboard',
      endpoint: 'https://megachad.xyz/api/chadboard',
      version: '1.0.0',
    },
    {
      name: 'Stats',
      endpoint: 'https://megachad.xyz/api/stats',
      version: '1.0.0',
    },
    {
      name: 'Gallery',
      endpoint: 'https://megachad.xyz/api/gallery',
      version: '1.0.0',
    },
    {
      name: 'AgentInfo',
      endpoint: 'https://megachad.xyz/api/agent/info',
      version: '1.0.0',
    },
  ],
  x402Support: true,
  active: true,
  registrations: [
    {
      agentId: 12408,
      agentRegistry: `eip155:4326:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`,
    },
  ],
  supportedTrust: ['reputation'],
} as const;

// Identity Registry ABI (subset needed for reads + registration)
export const IDENTITY_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'register',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'register',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setAgentURI',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'agentURI', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAgentWallet',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMetadata',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
  },
] as const;

// Reputation Registry ABI (subset for reads + feedback)
export const REPUTATION_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'giveFeedback',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'readFeedback',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'client', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'isRevoked', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSummary',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
    ],
    outputs: [
      { name: 'count', type: 'uint256' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryDecimals', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClients',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'revokeFeedback',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
