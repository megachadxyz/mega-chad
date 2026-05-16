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

// ── Pending deployment (sentinels until env vars are populated post-deploy) ──
const ZERO = '0x0000000000000000000000000000000000000000' as const;

export const MAINNET_MEGAGOONER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_MEGAGOONER_CONTRACT || ZERO) as `0x${string}`;

// V1/V2 staking sentinels (no migration on mainnet, always 0x0 — kept so UI imports resolve)
export const MAINNET_JESTERGOONER_V1_ADDRESS = ZERO as `0x${string}`;
export const MAINNET_JESTERGOONER_V2_ADDRESS = ZERO as `0x${string}`;
export const MAINNET_MOGGER_STAKING_V1_ADDRESS = ZERO as `0x${string}`;
export const MAINNET_FRAMEMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_FRAMEMOGGER_CONTRACT || ZERO) as `0x${string}`;
export const MAINNET_MOGGER_STAKING_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_MOGGER_STAKING_CONTRACT || ZERO) as `0x${string}`;
export const MAINNET_JESTERGOONER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_JESTERGOONER_CONTRACT || ZERO) as `0x${string}`;
export const MAINNET_JESTERMOGGER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_JESTERMOGGER_CONTRACT || ZERO) as `0x${string}`;
export const MAINNET_NFT_VETO_COUNCIL_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_NFT_VETO_COUNCIL_CONTRACT || ZERO) as `0x${string}`;
export const MAINNET_EMISSION_CONTROLLER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_EMISSION_CONTROLLER_CONTRACT || ZERO) as `0x${string}`;
export const MAINNET_CIRCUIT_BREAKER_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_CIRCUIT_BREAKER_CONTRACT || ZERO) as `0x${string}`;

// LP tokens (pending)
export const MAINNET_LP_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_LP_TOKEN_CONTRACT || ZERO) as `0x${string}`; // MEGACHAD/MEGAGOONER
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

// Re-export shared ABIs from testnet-contracts (ABIs are protocol-version-specific,
// not network-specific, so duplication would just drift over time)
export {
  ERC20_ABI,
  MEGAGOONER_ABI,
  FRAMEMOGGER_ABI,
  MOGGER_STAKING_ABI,
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
