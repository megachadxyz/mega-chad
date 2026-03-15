// Kumbaya DEX on MegaETH (Uniswap V3 fork)
// https://kumbaya.xyz

// Contract addresses (mainnet, chain ID 4326)
export const KUMBAYA_QUOTER_V2 = '0x1F1a8dC7E138C34b503Ca080962aC10B75384a27' as const;
export const KUMBAYA_SWAP_ROUTER = '0xE5BbEF8De2DB447a7432A47EBa58924d94eE470e' as const;
export const WETH = '0x4200000000000000000000000000000000000006' as const;
export const USDM = '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7' as const;
export const USDM_DECIMALS = 18;

// ABIs (minimal subsets for quoting + swapping)
export const QUOTER_V2_ABI = [
  {
    type: 'function',
    name: 'quoteExactInputSingle',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

export const SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
  },
] as const;

// Fee tiers available
export const FEE_TIERS = [500, 3000, 10000] as const;
export const DEFAULT_FEE = 3000; // 0.3% — standard pairs
