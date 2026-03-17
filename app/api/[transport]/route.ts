import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

const handler = createMcpHandler(
  (server) => {
    // ── Token Stats ───────────────────────────────────────
    server.registerTool(
      'get_megachad_stats',
      {
        title: 'Get $MEGACHAD Token Stats',
        description:
          'Returns current $MEGACHAD token statistics: total supply, circulating supply, tokens burned, and total burn count.',
        inputSchema: {},
      },
      async () => {
        const res = await fetch('https://megachad.xyz/api/stats');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Swap Quote ────────────────────────────────────────
    server.registerTool(
      'get_swap_quote',
      {
        title: 'Get Swap Quote',
        description:
          'Get a swap quote for buying $MEGACHAD with ETH on Kumbaya DEX (MegaETH). Returns router address, calldata params, and slippage-adjusted minimum output. Omit ethAmount for general swap info and contract addresses.',
        inputSchema: {
          ethAmount: z
            .string()
            .optional()
            .describe('Amount of ETH to swap (e.g. "0.1"). Omit for general info.'),
        },
      },
      async ({ ethAmount }) => {
        const url = ethAmount
          ? `https://megachad.xyz/api/x402/quote?ethAmount=${ethAmount}`
          : 'https://megachad.xyz/api/x402/quote';
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Looksmaxx Requirements ────────────────────────────
    server.registerTool(
      'get_looksmaxx_requirements',
      {
        title: 'Get Looksmaxx Requirements',
        description:
          'Returns the x402 payment requirements and $MEGACHAD burn requirements for looksmaxxing. Includes step-by-step instructions, contract addresses, and amounts.',
        inputSchema: {},
      },
      async () => {
        const res = await fetch('https://megachad.xyz/api/x402/looksmaxx');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Gallery ───────────────────────────────────────────
    server.registerTool(
      'get_gallery',
      {
        title: 'Get Looksmaxx Gallery',
        description:
          'Browse recent looksmaxxed burns with IPFS image URLs, burner addresses, timestamps, and NFT token IDs.',
        inputSchema: {
          limit: z.number().int().min(1).max(50).optional().describe('Number of results (default 20, max 50)'),
          offset: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
        },
      },
      async ({ limit, offset }) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (offset) params.set('offset', String(offset));
        const res = await fetch(`https://megachad.xyz/api/gallery?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Chadboard ─────────────────────────────────────────
    server.registerTool(
      'get_chadboard',
      {
        title: 'Get Chadboard Leaderboard',
        description:
          'Returns the burner leaderboard ranked by total burns. Includes ERC-8004 reputation scores, .mega domain names, profile info, and all looksmaxxed images per burner.',
        inputSchema: {},
      },
      async () => {
        const res = await fetch('https://megachad.xyz/api/chadboard');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Agent Info ─────────────────────────────────────────
    server.registerTool(
      'get_agent_info',
      {
        title: 'Get MegaChad Agent Info',
        description:
          'Returns ERC-8004 registration metadata, on-chain agent identity (ID, owner, wallet), reputation client count, and contract addresses.',
        inputSchema: {},
      },
      async () => {
        const res = await fetch('https://megachad.xyz/api/agent/info');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Early Access Registration ──────────────────────────
    server.registerTool(
      'register_early_access',
      {
        title: 'Register for Early Access',
        description:
          'Register a wallet for MegaChad testnet beta access. Checks on-chain eligibility ($MEGACHAD balance or looksmaxxed NFTs). Returns referral code and access status.',
        inputSchema: {
          wallet: z.string().describe('Ethereum wallet address (0x...)'),
          twitter: z.string().optional().describe('X/Twitter handle (optional for agents)'),
          referralCode: z.string().optional().describe('Referral code from existing registrant'),
        },
      },
      async ({ wallet, twitter, referralCode }) => {
        const res = await fetch('https://megachad.xyz/api/early/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet, twitter, referralCode }),
        });
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── NFT Metadata ──────────────────────────────────────
    server.registerTool(
      'get_nft_metadata',
      {
        title: 'Get NFT Metadata',
        description:
          'Returns ERC-721 metadata for a looksmaxxed NFT including image URL (IPFS or Warren on-chain), attributes, and storage properties.',
        inputSchema: {
          tokenId: z.string().describe('NFT token ID (numeric string)'),
        },
      },
      async ({ tokenId }) => {
        const res = await fetch(`https://megachad.xyz/api/metadata/${tokenId}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Token Price ────────────────────────────────────────
    server.registerTool(
      'get_price',
      {
        title: 'Get $MEGACHAD Price',
        description:
          'Returns the current $MEGACHAD price in ETH from Kumbaya DEX, plus the estimated ETH cost to burn 225,000 tokens.',
        inputSchema: {},
      },
      async () => {
        const res = await fetch('https://megachad.xyz/api/price');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Wallet Info ────────────────────────────────────────
    server.registerTool(
      'get_wallet_info',
      {
        title: 'Get Wallet Info',
        description:
          'Check a wallet\'s ETH balance, $MEGACHAD balance, NFT count, burn eligibility, and early access status.',
        inputSchema: {
          address: z.string().describe('Ethereum wallet address (0x...)'),
        },
      },
      async ({ address }) => {
        const res = await fetch(`https://megachad.xyz/api/wallet?address=${address}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Looksmaxx Plan (Intent) ────────────────────────────
    server.registerTool(
      'get_looksmaxx_plan',
      {
        title: 'Get Looksmaxx Plan',
        description:
          'Returns a complete, ordered set of transaction instructions for the full looksmaxx flow: swap → burn → tren fund → submit. Each step includes pre-built calldata ready to sign.',
        inputSchema: {
          wallet: z.string().describe('Wallet address (0x...)'),
          ethAmount: z
            .string()
            .optional()
            .describe('ETH to swap (e.g. "0.5"). Omit if wallet already has enough $MEGACHAD.'),
        },
      },
      async ({ wallet, ethAmount }) => {
        const params = new URLSearchParams({ wallet });
        if (ethAmount) params.set('ethAmount', ethAmount);
        const res = await fetch(`https://megachad.xyz/api/agent/looksmaxx?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Bridge Info ────────────────────────────────────────
    server.registerTool(
      'get_bridge_info',
      {
        title: 'Get Bridge Info',
        description:
          'Returns bridge information for moving assets to MegaETH from Ethereum, Arbitrum, Base, and other chains. Lists canonical and aggregator bridges.',
        inputSchema: {},
      },
      async () => {
        const res = await fetch('https://megachad.xyz/api/bridge');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );
  },
  {
    serverInfo: {
      name: 'megachad',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api',
    maxDuration: 60,
  },
);

export { handler as GET, handler as POST };
