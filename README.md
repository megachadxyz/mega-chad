# MegaChad — MCP Server & Burn-to-Create Engine on MegaETH

MegaChad is a **Model Context Protocol (MCP) server** and burn-to-create looksmaxxing engine on [MegaETH](https://megaeth.com). It exposes **19 MCP tools** that let AI agents interact with DeFi, NFTs, identity, and cross-chain operations on the MegaETH real-time blockchain.

## MCP Server

**Endpoint:** `https://megachad.xyz/api/mcp` (Streamable HTTP)

Connect any MCP-compatible client (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "megachad": {
      "url": "https://megachad.xyz/api/mcp"
    }
  }
}
```

### MCP Tools (19)

| Tool | Description |
|------|-------------|
| `get_megachad_stats` | Token supply, circulating supply, burn count |
| `get_price` | $MEGACHAD price in ETH from Kumbaya DEX |
| `get_swap_quote` | Swap quote for ETH → $MEGACHAD with calldata |
| `get_wallet_info` | Wallet balances, NFT count, burn eligibility |
| `get_portfolio` | Full MegaETH token portfolio (ETH, WETH, MEGACHAD, USDm) |
| `get_gallery` | Browse looksmaxxed burns with IPFS images |
| `get_chadboard` | Burner leaderboard with reputation scores and .mega names |
| `get_identity` | Resolve wallet or .mega name into unified identity profile |
| `get_nft_metadata` | ERC-721 metadata for looksmaxxed NFTs |
| `get_looksmaxx_requirements` | Burn requirements and x402 payment info |
| `get_looksmaxx_plan` | Full transaction plan: swap → burn → tren fund → submit |
| `cross_chain_looksmaxx` | Cross-chain plan from 10+ chains to MegaETH |
| `gasless_burn_info` | EIP-712 typed data for gasless meta-transaction burns |
| `get_bridge_info` | Bridge options for moving assets to MegaETH |
| `get_agent_info` | ERC-8004 agent registration and reputation data |
| `register_referral_agent` | Register as referring agent (earn 10% per burn) |
| `get_referral_stats` | Referral count, earnings, and reward info |
| `register_early_access` | Register wallet for beta access |
| `chat_with_megachad` | Natural language interface for all operations |
| `get_megaeth_protocols` | Curated MegaETH protocol directory |

## What It Does

- **Burn-to-Create:** Burn 225,000 $MEGACHAD tokens to generate AI-enhanced looksmaxxed portraits and mint NFTs on MegaETH
- **Cross-Chain:** Bridge + swap + burn from Ethereum, Base, Arbitrum, Optimism, Polygon, and 5 more chains
- **Identity Layer:** Unified profiles from on-chain data, MegaNames (.mega domains), burn history, reputation scores
- **Agent Referrals:** On-chain referral economy — agents earn 10% of tren fund per referred burn
- **x402 Payments:** HTTP 402 payment protocol via Meridian for API monetization
- **ERC-8004:** Registered on-chain agent with reputation tracking

## Tech Stack

- **Next.js 14** (App Router) on Vercel
- **MegaETH** (Chain ID 4326, ~250ms blocks, 100k+ TPS)
- **Wagmi + viem** for wallet interactions
- **mcp-handler** for MCP server implementation
- **Kumbaya DEX** for swaps
- **Warren Protocol** for on-chain image storage
- **Upstash Redis** for metadata caching

## Setup

```bash
git clone https://github.com/megachadxyz/mega-chad.git
cd mega-chad
npm install
cp env.example .env.local  # fill in API keys
npm run dev
```

## Links

- **App:** [megachad.xyz](https://megachad.xyz)
- **MCP Endpoint:** [megachad.xyz/api/mcp](https://megachad.xyz/api/mcp)
- **Repo:** [github.com/megachadxyz/mega-chad](https://github.com/megachadxyz/mega-chad)
- **X:** [@megachadxyz](https://x.com/megachadxyz)
