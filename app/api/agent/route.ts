import { NextResponse } from 'next/server';
import { ADDRESSES, CHAIN_BLOCK } from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent
 *
 * Single master directory for AI agents. Every other endpoint, MCP tool,
 * registry URL, and example flow is listed here. Designed so an agent can
 * fetch this once and have a complete map of what MegaChad exposes — no
 * front-end required.
 *
 * Cached lightly so repeated discovery is cheap.
 */
export async function GET() {
  return NextResponse.json(
    {
      name: 'MegaChad',
      version: '2.0.0',
      tagline:
        'Burn-to-create looksmaxxing engine + MEGA Protocol DeFi stack on MegaETH — fully drivable from calldata, no front-end required.',
      chain: CHAIN_BLOCK,
      contractRegistry: 'https://megachad.xyz/.well-known/megachad-protocol.json',
      manifests: {
        a2aAgentCard: 'https://megachad.xyz/.well-known/agent.json',
        mcpManifest: 'https://megachad.xyz/.well-known/mcp.json',
        openaiPlugin: 'https://megachad.xyz/.well-known/ai-plugin.json',
        openapi: 'https://megachad.xyz/.well-known/openapi.json',
        erc8004Registration: 'https://megachad.xyz/.well-known/agent-registration.json',
        agentsTxt: 'https://megachad.xyz/agents.txt',
        llmsTxt: 'https://megachad.xyz/llms.txt',
        llmsFullTxt: 'https://megachad.xyz/llms-full.txt',
      },
      mcp: {
        url: 'https://megachad.xyz/api/mcp',
        toolCount: 32,
        configExample: {
          claudeDesktop: {
            mcpServers: { megachad: { url: 'https://megachad.xyz/api/mcp' } },
          },
        },
      },
      quickstart: {
        recommendedFlow: [
          '1. GET /.well-known/megachad-protocol.json — cache the contract registry',
          '2. POST /api/agent/chat with { message, wallet } — natural language → calldata',
          '3. (Optional) Connect MCP at /api/mcp for typed tools in your agent',
        ],
        firstCall: {
          method: 'POST',
          url: '/api/agent/chat',
          body: { message: 'looksmaxx 0xYourWallet', wallet: '0xYourWallet' },
        },
      },
      contracts: {
        MEGACHAD: ADDRESSES.MEGACHAD,
        MEGAGOONER: ADDRESSES.MEGAGOONER,
        MEGACHADNFT: ADDRESSES.NFT,
        MoggerStaking: ADDRESSES.MOGGER_STAKING,
        JESTERGOONER_V4: ADDRESSES.JESTERGOONER,
        MegaChadLP_MC_MG: ADDRESSES.MC_MG_PAIR,
        Jestermogger: ADDRESSES.JESTERMOGGER,
        NFTVetoCouncil: ADDRESSES.NFT_VETO_COUNCIL,
        Framemogger: ADDRESSES.FRAMEMOGGER,
        EmissionController: ADDRESSES.EMISSION_CONTROLLER,
        CircuitBreaker: ADDRESSES.CIRCUIT_BREAKER,
      },
      endpoints: {
        discovery: {
          protocolRegistry: 'GET /.well-known/megachad-protocol.json',
          agentIndex: 'GET /api/agent (this)',
          agentInfo: 'GET /api/agent/info — ERC-8004 + on-chain agent identity',
        },
        naturalLanguage: {
          chat: 'POST /api/agent/chat { message, wallet? } — every intent supported',
        },
        reads: {
          stats: 'GET /api/stats',
          price: 'GET /api/price',
          wallet: 'GET /api/wallet?address=0x...',
          portfolio: 'GET /api/portal/tokens?address=0x...',
          identity: 'GET /api/identity/{addressOrName}',
          gallery: 'GET /api/gallery?limit=&offset=',
          chadboard: 'GET /api/chadboard',
          stakingPosition: 'GET /api/defi/staking?address=0x...',
          ammQuote: 'GET /api/defi/amm/quote?from=MC|MG&amount=...',
          proposals: 'GET /api/defi/governance/proposals?limit=20',
          proposal: 'GET /api/defi/governance/proposals/{id}?voter=0x...',
          emission: 'GET /api/defi/emission',
          nftInventory: 'GET /api/defi/nft?address=0x...',
          safety: 'GET /api/defi/safety',
          activity: 'GET /api/defi/activity?limit=50&blocks=2000',
          megaethProtocols: 'GET /api/portal/protocols',
          bridgeInfo: 'GET /api/bridge',
        },
        txBuilders: {
          swapEthForMc: 'GET /api/x402/quote?ethAmount=...',
          looksmaxxPlan: 'GET /api/agent/looksmaxx?wallet=&ethAmount=',
          crossChain: 'GET /api/cross-chain/intent?sourceChain=&wallet=&amount=',
          stakingTx: 'GET /api/defi/staking/tx?action=stake|unstake|claim&venue=mogger|jester&amount=&address=',
          ammSwapTx: 'GET /api/defi/amm/swap-tx?from=MC|MG&amount=&recipient=&slippageBps=200',
          ammAddLpTx: 'GET /api/defi/amm/add-liquidity-tx?amountMC=&amountMG=&recipient=&address=',
          voteTx: 'GET /api/defi/governance/vote-tx?proposalId=&support=for|against|abstain',
          queueTx: 'GET /api/defi/governance/queue-tx?proposalId=',
          executeTx: 'GET /api/defi/governance/execute-tx?proposalId=',
          proposeTx: 'GET /api/defi/governance/propose-tx?proposer=0x...&template=...',
          vetoTx: 'GET /api/defi/governance/veto-tx?proposalId=&support=yes|no&voter=0x...',
          gaslessBurn: 'GET /api/gasless/burn?address=0x...',
        },
        agentEconomy: {
          register: 'POST /api/agent/register { wallet, mcpEndpoint?, description? }',
          referrals: 'GET /api/agent/referrals?address=0x...',
          earlyAccess: 'POST /api/early/register { wallet, twitter?, referralCode? }',
        },
      },
      intents: [
        'looksmaxx', 'cross_chain_looksmaxx', 'swap', 'burn', 'bridge',
        'price', 'stats', 'wallet', 'gallery', 'leaderboard',
        'referral', 'register_agent', 'gasless', 'compare', 'multi_burn',
        'schedule', 'about', 'identity',
        'stake', 'unstake', 'claim_rewards', 'staking_position',
        'swap_mc_mg', 'add_liquidity',
        'list_proposals', 'proposal_detail', 'vote', 'queue_proposal', 'execute_proposal',
        'propose', 'veto',
        'emission_schedule', 'protocol_registry',
        'nft_inventory', 'safety', 'activity',
      ],
      examples: [
        { message: 'looksmaxx 0xABC...', returns: 'Full burn+mint flow with calldata' },
        { message: 'stake 50000 megachad', returns: 'MoggerStaking approve+stake' },
        { message: 'swap 1000 MC for MG', returns: 'MegaChadLP two-step swap plan' },
        { message: 'vote for proposal 3', returns: 'castVote(3, 1) calldata' },
        { message: 'is the protocol paused?', returns: 'CircuitBreaker state' },
        { message: 'am I eligible for staking rewards?', returns: 'NFT count + eligibility verdict' },
        { message: 'what happened in the last hour?', returns: 'Recent protocol activity feed' },
      ],
      authentication: {
        publicReads: 'No auth required.',
        x402: 'AI portrait generation gates on a 1 USDm payment via x402. See /.well-known/agent.json for scheme details.',
      },
      legal: { terms: 'https://megachad.xyz/terms', privacy: 'https://megachad.xyz/privacy' },
      contact: { email: 'megachadtoken@proton.me' },
    },
    {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
    },
  );
}
