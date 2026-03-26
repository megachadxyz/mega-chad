# MegaChad — MCP Server & Burn-to-Create Engine on MegaETH

MegaChad is a **Model Context Protocol (MCP) server** and burn-to-create looksmaxxing engine on [MegaETH](https://megaeth.com). It exposes **20 MCP tools** that let AI agents interact with DeFi, NFTs, identity, and cross-chain operations on the MegaETH real-time blockchain.

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

### MCP Tools (20)

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
| `register_referral_agent` | Register as referring agent (earn 11,250 $MEGACHAD per burn) |
| `get_referral_stats` | Referral count, earnings, and reward info |
| `register_early_access` | Register wallet for beta access |
| `chat_with_megachad` | Natural language interface for all operations |
| `get_megaeth_protocols` | Curated MegaETH protocol directory |

## What It Does

- **Burn-to-Create:** Burn 225,000 $MEGACHAD tokens to generate AI-enhanced looksmaxxed portraits and mint NFTs on MegaETH
- **Cross-Chain:** Bridge + swap + burn from Ethereum, Base, Arbitrum, Optimism, Polygon, and 5 more chains
- **Identity Layer:** Unified profiles from on-chain data, MegaNames (.mega domains), burn history, reputation scores
- **Chadboard & Tiers:** Leaderboard ranked by burns — Normie (0) → Mewer (1+) → Bonesmasher (3+) → Chad (10+) → Gigachad (25+)
- **ChadChat:** Burn-gated real-time messaging for holders (Mewer tier+), powered by Ably
- **Agent Referrals:** On-chain referral economy — agents earn 11,250 $MEGACHAD (5%) per referred burn
- **MEGA Protocol Governance:** $MEGAGOONER token (50M cap, 225-week quadratic emission) with Framemogger, MoggerStaking, JESTERGOONER staking, and Jestermogger governance voting
- **x402 Payments:** HTTP 402 payment protocol via Meridian for API monetization
- **ERC-8004:** Registered on-chain agent (#12408) with reputation tracking
- **Telegram Alerts:** Real-time burn/mint notifications via [@megachads](https://t.me/megachads)
- **Natural Language:** NLP transaction engine — type plain English, get structured calldata
- **Gasless Burns:** EIP-712 meta-transactions via relayer — no gas fees needed
- **MegaETH Portal:** Portfolio viewer, protocol directory, live network stats, NLP command bar
- **Farcaster Frames:** Frame-based burn gallery, leaderboard, and price discovery
- **Analytics:** Per-endpoint and per-MCP-tool usage tracking

## API Endpoints (36)

### Core
- `GET /api/stats` — Token supply, burn count
- `GET /api/price` — Current price + burn cost
- `GET /api/wallet?address=0x` — Balance + eligibility
- `GET /api/gallery?limit=20` — Recent burns
- `GET /api/chadboard` — Leaderboard

### Burn & Generation
- `GET|POST /api/x402/looksmaxx` — x402-gated looksmaxx
- `GET /api/x402/quote?ethAmount=0.1` — Swap quote
- `POST /api/generate` — Direct burn + generate
- `GET|POST /api/gasless/burn` — EIP-712 gasless burn
- `POST /api/warren/deploy` — Warren on-chain storage
- `GET /api/metadata/{tokenId}` — NFT metadata

### Agent & NLP
- `POST /api/agent/chat` — Natural language transactions
- `GET /api/agent/looksmaxx?wallet=0x` — Full burn plan
- `GET /api/agent/info` — ERC-8004 identity
- `GET|POST /api/agent/register` — Agent registration
- `GET /api/agent/referrals?address=0x` — Referral stats

### Cross-Chain & Bridge
- `GET /api/cross-chain/intent?sourceChain=base` — Cross-chain plan
- `GET /api/cross-chain/status?id=cc_` — Intent tracking
- `GET /api/bridge` — Bridge infrastructure

### Identity & Portal
- `GET /api/identity/{address}` — Unified identity profile
- `GET /api/portal/tokens?address=0x` — MegaETH portfolio
- `GET /api/portal/protocols` — Protocol directory

### Social & Messaging
- `POST /api/chat/auth` — ChadChat Ably auth token
- `GET|POST /api/chat/messages` — Chat message storage
- `GET|POST /api/chat/name` — Display name management
- `POST /api/telegram` — Telegram bot webhook
- `POST /api/telegram/alerts` — Burn/mint notifications
- `GET /api/frame` — Farcaster frame navigation

### Infrastructure
- `GET /api/events` — SSE event stream
- `GET /api/analytics` — Usage tracking
- `POST /api/early/register` — Beta access registration

## Tech Stack

- **Next.js 14** (App Router) on Vercel
- **MegaETH** (Chain ID 4326, ~250ms blocks, 100k+ TPS)
- **Wagmi + viem** for wallet interactions
- **mcp-handler** for MCP server implementation
- **Kumbaya DEX** for swaps
- **Warren Protocol** for on-chain image storage
- **Ably** for real-time ChadChat messaging
- **Upstash Redis** for metadata caching
- **Pinata** for IPFS storage
- **Replicate** for AI generation (Flux 2 Max)
- **Meridian** for x402 payments (USDm)

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
