# MegaChad Autonomous Agent Example

A standalone TypeScript example demonstrating how an AI agent can autonomously discover, plan, and interact with the MegaChad burn-to-create looksmaxxing engine on MegaETH.

## What This Does

This example walks through the full MegaChad agent flow **without executing any transactions**. It demonstrates:

1. **Discovery** — Fetches the agent card from `/.well-known/agent.json` to learn available skills
2. **Wallet Check** — Queries on-chain balances for the agent wallet
3. **Price Feed** — Gets current MEGACHAD token price
4. **Swap Quote** — Gets a quote to swap ETH for MEGACHAD (if needed)
5. **Looksmaxx Plan** — Fetches a full orchestrated burn plan with pre-built calldata
6. **Gasless Burn** — Checks if a gasless (meta-transaction) burn is available
7. **Leaderboard** — Shows top burners on the Chadboard
8. **Protocol Stats** — Displays overall protocol statistics

An autonomous agent with a funded wallet could take each step's calldata and sign + broadcast the transactions to complete the full looksmaxx flow.

## Prerequisites

- **Node.js** >= 18 (for native `fetch`)
- **ts-node** (installed as a dev dependency)

For the MCP example:
- **@modelcontextprotocol/sdk** (installed as a dependency)

## Setup

```bash
cd examples/autonomous-agent
npm install
```

## Running

### Standard Agent Flow

```bash
npm start
```

Or with a specific wallet address:

```bash
AGENT_WALLET=0xYourAddress npm start
```

### MCP Agent Flow

```bash
npm run mcp
```

Or with a specific wallet address:

```bash
AGENT_WALLET=0xYourAddress npm run mcp
```

## Files

| File | Description |
|------|-------------|
| `agent.ts` | Main agent script — REST API discovery and planning flow |
| `agent-with-mcp.ts` | MCP-native agent integration via Streamable HTTP |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |

## Architecture

```
Agent Wallet (read-only demo)
    |
    v
[1] GET /.well-known/agent.json     --> Discover capabilities
[2] GET /api/wallet?address=...      --> Check balances
[3] GET /api/price                   --> Get MEGACHAD price
[4] GET /api/x402/quote?ethAmount=.. --> Get swap quote
[5] GET /api/agent/looksmaxx?wallet= --> Get full burn plan + calldata
[6] GET /api/gasless/burn?address=.. --> Check gasless option
[7] GET /api/chadboard               --> View leaderboard
[8] GET /api/stats                   --> View protocol stats
```

## Network

- **Chain:** MegaETH (Chain ID 4326)
- **RPC:** `https://mainnet.megaeth.com/rpc`

## Notes

- This script does **not** sign or send any transactions. It is a read-only demonstration.
- To build a real autonomous agent, you would add a signer (e.g., viem, ethers) to execute the calldata returned by the looksmaxx plan endpoint.
- The MCP example connects to the MegaChad MCP server via Streamable HTTP transport.
