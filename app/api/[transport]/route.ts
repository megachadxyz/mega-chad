import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { trackMcpTool } from '@/lib/analytics';

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
        trackMcpTool('get_megachad_stats').catch(() => {});
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
        trackMcpTool('get_swap_quote').catch(() => {});
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
        trackMcpTool('get_looksmaxx_requirements').catch(() => {});
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
        trackMcpTool('get_gallery').catch(() => {});
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
        trackMcpTool('get_chadboard').catch(() => {});
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
        trackMcpTool('get_agent_info').catch(() => {});
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
        trackMcpTool('register_early_access').catch(() => {});
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
        trackMcpTool('get_nft_metadata').catch(() => {});
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
        trackMcpTool('get_price').catch(() => {});
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
        trackMcpTool('get_wallet_info').catch(() => {});
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
        trackMcpTool('get_looksmaxx_plan').catch(() => {});
        const params = new URLSearchParams({ wallet });
        if (ethAmount) params.set('ethAmount', ethAmount);
        const res = await fetch(`https://megachad.xyz/api/agent/looksmaxx?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Gasless Burn ────────────────────────────────────────
    server.registerTool(
      'gasless_burn_info',
      {
        title: 'Get Gasless Burn Info',
        description:
          'Get EIP-712 typed data for a gasless burn. Returns the signature payload a wallet must sign, plus approval status. After signing, POST the signature to /api/gasless/burn to relay the burn without paying gas.',
        inputSchema: {
          address: z.string().describe('Wallet address (0x...)'),
        },
      },
      async ({ address }) => {
        trackMcpTool('gasless_burn_info').catch(() => {});
        const res = await fetch(`https://megachad.xyz/api/gasless/burn?address=${address}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Agent Register ────────────────────────────────────
    server.registerTool(
      'register_referral_agent',
      {
        title: 'Register as Referral Agent',
        description:
          'Register a wallet as a MegaChad referring agent. Returns registration transaction calldata and a referral code. Referring agents earn 10% of the tren fund portion (11,250 $MEGACHAD) for every burn they refer.',
        inputSchema: {
          wallet: z.string().describe('Agent wallet address (0x...)'),
          mcpEndpoint: z.string().optional().describe('Agent MCP server URL (optional)'),
          description: z.string().optional().describe('Agent description (optional)'),
        },
      },
      async ({ wallet, mcpEndpoint, description }) => {
        trackMcpTool('register_referral_agent').catch(() => {});
        const res = await fetch('https://megachad.xyz/api/agent/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet, mcpEndpoint, description }),
        });
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Agent Referrals ──────────────────────────────────
    server.registerTool(
      'get_referral_stats',
      {
        title: 'Get Referral Stats',
        description:
          'Get referral statistics for a registered agent — total referrals, earnings, reward per burn, and calldata for referred burns.',
        inputSchema: {
          address: z.string().describe('Agent wallet address (0x...)'),
        },
      },
      async ({ address }) => {
        trackMcpTool('get_referral_stats').catch(() => {});
        const res = await fetch(`https://megachad.xyz/api/agent/referrals?address=${address}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Natural Language Chat ─────────────────────────────
    server.registerTool(
      'chat_with_megachad',
      {
        title: 'Chat with MegaChad',
        description:
          'Send a plain English message and get back structured, actionable responses. Supports intents: price, stats, wallet, looksmaxx, swap, gallery, leaderboard, bridge, gasless, referral, about.',
        inputSchema: {
          message: z.string().describe('Natural language query (e.g. "What is the current MEGACHAD price?")'),
          wallet: z
            .string()
            .optional()
            .describe('Wallet address for context (0x...). Optional.'),
        },
      },
      async ({ message, wallet }) => {
        trackMcpTool('chat_with_megachad').catch(() => {});
        const res = await fetch('https://megachad.xyz/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, wallet }),
        });
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
        trackMcpTool('get_bridge_info').catch(() => {});
        const res = await fetch('https://megachad.xyz/api/bridge');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Cross-Chain Intent ───────────────────────────────────
    server.registerTool(
      'cross_chain_looksmaxx',
      {
        title: 'Cross-Chain Looksmaxx',
        description:
          'Build a cross-chain looksmaxx plan from any supported chain (Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, Scroll, zkSync, Linea) to MegaETH. Returns step-by-step execution plan with bridge URLs, swap calldata, and burn instructions.',
        inputSchema: {
          sourceChain: z.string().describe('Source chain name (e.g. "base", "arbitrum", "ethereum")'),
          wallet: z.string().optional().describe('Wallet address for pre-built calldata (0x...)'),
          amount: z.string().optional().describe('ETH amount to bridge (e.g. "0.15")'),
          referrer: z.string().optional().describe('Referrer agent address for 5% commission (0x...)'),
        },
      },
      async ({ sourceChain, wallet, amount, referrer }) => {
        trackMcpTool('cross_chain_looksmaxx').catch(() => {});
        const params = new URLSearchParams({ sourceChain });
        if (wallet) params.set('wallet', wallet);
        if (amount) params.set('amount', amount);
        if (referrer) params.set('referrer', referrer);
        const res = await fetch(`https://megachad.xyz/api/cross-chain/intent?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Identity / Profile Lookup ────────────────────────────
    server.registerTool(
      'get_identity',
      {
        title: 'Get MegaChad Identity',
        description:
          'Resolve a wallet address or .mega name into a unified MegaETH identity profile. Returns: MegaNames data, token balances, burn history & rank, reputation score, referral stats, tier level, and social links. Works as the social identity layer for MegaETH.',
        inputSchema: {
          addressOrName: z.string().describe('Wallet address (0x...) or .mega name (e.g. "chad.mega" or "chad")'),
        },
      },
      async ({ addressOrName }) => {
        trackMcpTool('get_identity').catch(() => {});
        const res = await fetch(`https://megachad.xyz/api/identity/${encodeURIComponent(addressOrName)}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── MegaETH Portal: Token Balances ───────────────────────
    server.registerTool(
      'get_portfolio',
      {
        title: 'Get MegaETH Portfolio',
        description:
          'Get all MegaETH token balances for a wallet: ETH, WETH, $MEGACHAD, USDm. Returns formatted balances with raw values.',
        inputSchema: {
          address: z.string().describe('Wallet address (0x...)'),
        },
      },
      async ({ address }) => {
        trackMcpTool('get_portfolio').catch(() => {});
        const res = await fetch(`https://megachad.xyz/api/portal/tokens?address=${address}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Protocol Registry (single source of truth) ──────────
    server.registerTool(
      'get_protocol_registry',
      {
        title: 'Get MEGA Protocol Registry',
        description:
          'Canonical machine-readable registry of every MEGA Protocol contract: tokens (MEGACHAD, MEGAGOONER), AMM pair (MC/MG), staking (MoggerStaking, JESTERGOONER), governance (Jestermogger, NFTVetoCouncil, Framemogger), emissions (EmissionController), and safety (CircuitBreaker). Includes addresses, proxy/impl, ABIs, known gotchas, and direct links to all agent endpoints. Pull this FIRST for any DeFi interaction.',
        inputSchema: {},
      },
      async () => {
        trackMcpTool('get_protocol_registry').catch(() => {});
        const res = await fetch('https://megachad.xyz/.well-known/megachad-protocol.json');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Staking Position ──────────────────────────────
    server.registerTool(
      'get_staking_position',
      {
        title: 'Get Staking Position (MoggerStaking + JESTERGOONER)',
        description:
          'Returns combined position across both staking venues: MoggerStaking (stake MEGACHAD → earn MEGAGOONER) and JESTERGOONER V4 (stake MC/MG LP → earn MEGAGOONER). Includes balances, allowances, earned rewards, NFT boost, APR, and global pool stats. Without address, returns global stats only.',
        inputSchema: {
          address: z.string().optional().describe('Wallet address (0x...) — optional, gives per-wallet position'),
        },
      },
      async ({ address }) => {
        trackMcpTool('get_staking_position').catch(() => {});
        const url = address
          ? `https://megachad.xyz/api/defi/staking?address=${address}`
          : 'https://megachad.xyz/api/defi/staking';
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build Staking TX ──────────────────────────────
    server.registerTool(
      'build_staking_tx',
      {
        title: 'Build Staking Transaction',
        description:
          'Returns ready-to-sign transactions for stake / unstake / claim on either MoggerStaking (venue=mogger, stake MEGACHAD) or JESTERGOONER V4 (venue=jester, stake MC/MG LP). Stake actions return approve+stake; unstake/claim return a single tx. Each item has { to, value, data } you can pass to eth_sendTransaction.',
        inputSchema: {
          action: z.enum(['stake', 'unstake', 'claim']).describe('Which action to build'),
          venue: z.enum(['mogger', 'jester']).describe('mogger = MoggerStaking (MEGACHAD), jester = JESTERGOONER V4 (LP)'),
          amount: z.string().optional().describe('Amount in human units (e.g. "1000"). Required for stake/unstake.'),
          address: z.string().optional().describe('Wallet address — used to skip approve if allowance is sufficient'),
        },
      },
      async ({ action, venue, amount, address }) => {
        trackMcpTool('build_staking_tx').catch(() => {});
        const params = new URLSearchParams({ action, venue });
        if (amount) params.set('amount', amount);
        if (address) params.set('address', address);
        const res = await fetch(`https://megachad.xyz/api/defi/staking/tx?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: AMM Quote ─────────────────────────────────────
    server.registerTool(
      'get_amm_quote',
      {
        title: 'Get MEGACHAD/MEGAGOONER AMM Quote',
        description:
          'Quote a swap on the MegaChadLP MC/MG pair (constant-product, 0.3% fee). Returns expected output, price impact, and spot prices. WARNING: this pair uses tokenA/tokenB instead of token0/token1 so standard Uniswap V2 routers do not detect it — use this tool. Omit `from` + `amount` to just inspect reserves.',
        inputSchema: {
          from: z.enum(['MC', 'MG']).optional().describe('Input token: MC (MEGACHAD) or MG (MEGAGOONER)'),
          amount: z.string().optional().describe('Input amount in human units (e.g. "1000")'),
        },
      },
      async ({ from, amount }) => {
        trackMcpTool('get_amm_quote').catch(() => {});
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (amount) params.set('amount', amount);
        const url = `https://megachad.xyz/api/defi/amm/quote${params.toString() ? `?${params}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build AMM Swap TX ─────────────────────────────
    server.registerTool(
      'build_amm_swap_tx',
      {
        title: 'Build MC↔MG Swap Transaction',
        description:
          'Build a two-step plan to swap MEGACHAD↔MEGAGOONER through MegaChadLP: ERC20.transfer(pair, amountIn) → pair.swap(amountAIn, amountBIn, to). MegaChadLP has no on-chain minOut — verify your received balance after the swap. Slippage is computed off-chain and surfaced as minOut.',
        inputSchema: {
          from: z.enum(['MC', 'MG']).describe('Input token'),
          amount: z.string().describe('Input amount in human units (e.g. "1000")'),
          recipient: z.string().describe('Receive address (0x...)'),
          slippageBps: z.number().int().min(0).max(5000).optional().describe('Slippage tolerance in bps (default 200 = 2%)'),
        },
      },
      async ({ from, amount, recipient, slippageBps }) => {
        trackMcpTool('build_amm_swap_tx').catch(() => {});
        const params = new URLSearchParams({ from, amount, recipient });
        if (slippageBps !== undefined) params.set('slippageBps', String(slippageBps));
        const res = await fetch(`https://megachad.xyz/api/defi/amm/swap-tx?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build Add Liquidity TX ────────────────────────
    server.registerTool(
      'build_amm_add_liquidity_tx',
      {
        title: 'Build Add Liquidity Transaction',
        description:
          'Build approve(MC) + approve(MG) + addLiquidity on MegaChadLP MC/MG. The pair refunds whichever side is over-supplied. LP shares returned are stake-eligible in JESTERGOONER V4.',
        inputSchema: {
          amountMC: z.string().describe('MEGACHAD amount in human units'),
          amountMG: z.string().describe('MEGAGOONER amount in human units'),
          recipient: z.string().describe('LP token recipient (0x...)'),
          address: z.string().optional().describe('Sender address — used to skip approve steps if allowance is sufficient'),
        },
      },
      async ({ amountMC, amountMG, recipient, address }) => {
        trackMcpTool('build_amm_add_liquidity_tx').catch(() => {});
        const params = new URLSearchParams({ amountMC, amountMG, recipient });
        if (address) params.set('address', address);
        const res = await fetch(`https://megachad.xyz/api/defi/amm/add-liquidity-tx?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: List Proposals ────────────────────────────────
    server.registerTool(
      'list_governance_proposals',
      {
        title: 'List Jestermogger Proposals',
        description:
          'List recent Jestermogger governance proposals with state (Pending / Active / Defeated / Succeeded / Queued / Executed / Expired / Vetoed), vote tallies, timing, and per-proposal lookup URLs.',
        inputSchema: {
          limit: z.number().int().min(1).max(100).optional().describe('Number of proposals (default 20)'),
        },
      },
      async ({ limit }) => {
        trackMcpTool('list_governance_proposals').catch(() => {});
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        const res = await fetch(`https://megachad.xyz/api/defi/governance/proposals?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Get Proposal Detail ───────────────────────────
    server.registerTool(
      'get_governance_proposal',
      {
        title: 'Get Single Proposal Detail',
        description:
          'Full state for one Jestermogger proposal: actions (target/value/calldata), vote tally, NFT veto council status, and (if voter passed) the voter receipt with vote weight.',
        inputSchema: {
          proposalId: z.number().int().min(1).describe('Proposal ID (1-indexed)'),
          voter: z.string().optional().describe('Voter address to look up receipt'),
        },
      },
      async ({ proposalId, voter }) => {
        trackMcpTool('get_governance_proposal').catch(() => {});
        const url = voter
          ? `https://megachad.xyz/api/defi/governance/proposals/${proposalId}?voter=${voter}`
          : `https://megachad.xyz/api/defi/governance/proposals/${proposalId}`;
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build Vote TX ─────────────────────────────────
    server.registerTool(
      'build_vote_tx',
      {
        title: 'Build Vote Transaction',
        description:
          'Build a castVote tx on Jestermogger. Support values: for | against | abstain. Vote weight = your MEGAGOONER balance at proposal snapshot.',
        inputSchema: {
          proposalId: z.number().int().min(1).describe('Proposal ID'),
          support: z.enum(['for', 'against', 'abstain']).describe('Vote direction'),
        },
      },
      async ({ proposalId, support }) => {
        trackMcpTool('build_vote_tx').catch(() => {});
        const res = await fetch(
          `https://megachad.xyz/api/defi/governance/vote-tx?proposalId=${proposalId}&support=${support}`,
        );
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Emission Schedule ─────────────────────────────
    server.registerTool(
      'get_emission_schedule',
      {
        title: 'Get MEGAGOONER Emission Schedule',
        description:
          'Returns the full 225-week MEGAGOONER emission schedule plus current week, on-chain weekly emission, and the EmissionController split (mogger / jester / treasury). Formula: 662245 * ((225 - w) / 225)^2 MEGAGOONER per week.',
        inputSchema: {},
      },
      async () => {
        trackMcpTool('get_emission_schedule').catch(() => {});
        const res = await fetch('https://megachad.xyz/api/defi/emission');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build Queue TX ────────────────────────────────
    server.registerTool(
      'build_queue_tx',
      {
        title: 'Build Queue Proposal TX',
        description:
          'Build queue(proposalId) calldata for a Succeeded Jestermogger proposal. Starts the 2-day timelock — after that, the proposal can be executed.',
        inputSchema: {
          proposalId: z.number().int().min(1).describe('Proposal ID (1-indexed)'),
        },
      },
      async ({ proposalId }) => {
        trackMcpTool('build_queue_tx').catch(() => {});
        const res = await fetch(`https://megachad.xyz/api/defi/governance/queue-tx?proposalId=${proposalId}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build Execute TX ──────────────────────────────
    server.registerTool(
      'build_execute_tx',
      {
        title: 'Build Execute Proposal TX',
        description:
          'Build execute(proposalId) calldata for a Queued Jestermogger proposal past its 2-day timelock. May be payable if any action carries ETH value.',
        inputSchema: {
          proposalId: z.number().int().min(1).describe('Proposal ID'),
        },
      },
      async ({ proposalId }) => {
        trackMcpTool('build_execute_tx').catch(() => {});
        const res = await fetch(`https://megachad.xyz/api/defi/governance/execute-tx?proposalId=${proposalId}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build Propose TX (eligibility + template) ─────
    server.registerTool(
      'build_propose_tx',
      {
        title: 'Build Propose TX / Check Eligibility',
        description:
          'GET form returns Framemogger top-3-burner eligibility for the proposer (only top 3 can propose each week). To actually build calldata, POST your { targets[], values[], calldatas[], description } payload to /api/defi/governance/propose-tx. Use this MCP tool to quickly check eligibility before drafting.',
        inputSchema: {
          proposer: z.string().optional().describe('Proposer wallet address (0x...) — required for eligibility check'),
        },
      },
      async ({ proposer }) => {
        trackMcpTool('build_propose_tx').catch(() => {});
        const url = proposer
          ? `https://megachad.xyz/api/defi/governance/propose-tx?proposer=${proposer}`
          : 'https://megachad.xyz/api/defi/governance/propose-tx';
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Build Veto TX ─────────────────────────────────
    server.registerTool(
      'build_veto_tx',
      {
        title: 'Build NFT Veto TX',
        description:
          'Build castVetoVote calldata on NFTVetoCouncil. support yes = veto, no = defend. If no veto window has been opened for the proposal, the response includes an extra startVetoVote() step. Voter is optional — providing it checks council-membership + duplicate-vote state.',
        inputSchema: {
          proposalId: z.number().int().min(1).describe('Proposal ID'),
          support: z.enum(['yes', 'no']).optional().describe('yes = veto, no = defend (default yes)'),
          voter: z.string().optional().describe('Voter wallet address (0x...) — checks council-membership status'),
        },
      },
      async ({ proposalId, support, voter }) => {
        trackMcpTool('build_veto_tx').catch(() => {});
        const params = new URLSearchParams({ proposalId: String(proposalId) });
        if (support) params.set('support', support);
        if (voter) params.set('voter', voter);
        const res = await fetch(`https://megachad.xyz/api/defi/governance/veto-tx?${params}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: NFT Inventory + Eligibility ───────────────────
    server.registerTool(
      'get_nft_inventory',
      {
        title: 'Get NFT Inventory + Staking Eligibility',
        description:
          'MEGACHADNFT count for a wallet + boost tier (1+/10+/25+) + verdict on staking-reward eligibility (1+ NFT required). Use this BEFORE building any stake tx — a wallet with 0 NFTs accrues 0 rewards even when staked.',
        inputSchema: {
          address: z.string().describe('Wallet address (0x...)'),
        },
      },
      async ({ address }) => {
        trackMcpTool('get_nft_inventory').catch(() => {});
        const res = await fetch(`https://megachad.xyz/api/defi/nft?address=${address}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Protocol Safety Status ────────────────────────
    server.registerTool(
      'get_protocol_safety',
      {
        title: 'Get Protocol Safety Status',
        description:
          'CircuitBreaker state (paused?, guardian votes, auto-unpause timer) + NFTVetoCouncil composition (20 seats, threshold, current members). Critical context BEFORE sending any write — if paused, every staking/AMM/governance write reverts.',
        inputSchema: {},
      },
      async () => {
        trackMcpTool('get_protocol_safety').catch(() => {});
        const res = await fetch('https://megachad.xyz/api/defi/safety');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── DeFi: Activity Feed ─────────────────────────────────
    server.registerTool(
      'get_activity_feed',
      {
        title: 'Get MEGA Protocol Activity Feed',
        description:
          'Unified time-ordered feed of recent on-chain events across the MEGA Protocol stack: burns, Framemogger sends, stakes / unstakes / claims (Mogger + Jester), proposal lifecycle (created / voted / queued / executed). Defaults: last 2000 blocks (~8 min on MegaETH), 50 events.',
        inputSchema: {
          limit: z.number().int().min(1).max(200).optional().describe('Max events to return (default 50, max 200)'),
          blocks: z.number().int().min(100).max(50000).optional().describe('Block window to scan (default 2000)'),
        },
      },
      async ({ limit, blocks }) => {
        trackMcpTool('get_activity_feed').catch(() => {});
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (blocks) params.set('blocks', String(blocks));
        const url = `https://megachad.xyz/api/defi/activity${params.toString() ? `?${params}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── Agent Index (master directory) ──────────────────────
    server.registerTool(
      'get_agent_index',
      {
        title: 'Get MegaChad Agent Index',
        description:
          'Master directory of every MegaChad endpoint, MCP tool, manifest URL, and example. The recommended first call for any agent — returns the complete surface in a single response.',
        inputSchema: {},
      },
      async () => {
        trackMcpTool('get_agent_index').catch(() => {});
        const res = await fetch('https://megachad.xyz/api/agent');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );

    // ── MegaETH Protocol Directory ───────────────────────────
    server.registerTool(
      'get_megaeth_protocols',
      {
        title: 'Get MegaETH Protocol Directory',
        description:
          'Returns a curated directory of protocols on MegaETH: DEXes, bridges, payment infra, storage, identity systems. Includes contract addresses, features, and links.',
        inputSchema: {},
      },
      async () => {
        trackMcpTool('get_megaeth_protocols').catch(() => {});
        const res = await fetch('https://megachad.xyz/api/portal/protocols');
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
