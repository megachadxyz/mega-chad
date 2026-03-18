/**
 * MegaChad MCP Agent — Model Context Protocol Integration Demo
 *
 * This script demonstrates how an AI agent connects to MegaChad via the
 * Model Context Protocol (MCP) using Streamable HTTP transport.
 *
 * MCP gives agents a standardized way to discover and invoke tools
 * exposed by the MegaChad protocol — no REST API knowledge required.
 *
 * Usage:
 *   AGENT_WALLET=0x... npx ts-node agent-with-mcp.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// ─── ANSI color helpers (cyberpunk / chad aesthetic) ────────────────────────

const PINK = "\x1b[38;2;247;134;198m"; // #F786C6
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function header(text: string): void {
  const bar = "═".repeat(60);
  console.log(`\n${PINK}${BOLD}${bar}${RESET}`);
  console.log(`${PINK}${BOLD}  ${text}${RESET}`);
  console.log(`${PINK}${BOLD}${bar}${RESET}\n`);
}

function subheader(text: string): void {
  console.log(`\n${CYAN}${BOLD}  >>> ${text}${RESET}\n`);
}

function info(label: string, value: string | number): void {
  console.log(`  ${DIM}${label}:${RESET} ${GREEN}${value}${RESET}`);
}

function warn(text: string): void {
  console.log(`  ${YELLOW}[!] ${text}${RESET}`);
}

function error(text: string): void {
  console.log(`  ${RED}[ERROR] ${text}${RESET}`);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function formatUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Config ─────────────────────────────────────────────────────────────────

const MCP_URL = "https://megachad.xyz/api/mcp";
const AGENT_WALLET =
  process.env.AGENT_WALLET || "0x000000000000000000000000000000000000dEaD";

// ─── MCP Client Setup ──────────────────────────────────────────────────────

async function createMcpClient(): Promise<Client> {
  const client = new Client({
    name: "megachad-autonomous-agent",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));

  console.log(`  ${DIM}Connecting to MCP server at ${MCP_URL}...${RESET}`);
  await client.connect(transport);
  console.log(`  ${GREEN}Connected to MegaChad MCP server.${RESET}\n`);

  return client;
}

// ─── Tool invocation helper ─────────────────────────────────────────────────

async function callTool(
  client: Client,
  toolName: string,
  args: Record<string, any> = {}
): Promise<any> {
  console.log(`  ${DIM}Calling tool: ${toolName}${args && Object.keys(args).length > 0 ? ` (${JSON.stringify(args)})` : ""}${RESET}`);

  try {
    const result = await client.callTool({ name: toolName, arguments: args });

    // MCP tool results come as content blocks
    if (result.content && Array.isArray(result.content)) {
      for (const block of result.content) {
        if (block.type === "text") {
          // Try to parse as JSON for structured display
          try {
            return JSON.parse(block.text);
          } catch {
            return block.text;
          }
        }
      }
    }

    return result;
  } catch (err: any) {
    error(`Tool "${toolName}" failed: ${err.message}`);
    return null;
  }
}

// ─── Demo Steps ─────────────────────────────────────────────────────────────

/**
 * Step 1: List all available MCP tools.
 * This is the MCP equivalent of fetching the agent card — the agent
 * discovers what capabilities are available programmatically.
 */
async function stepListTools(client: Client): Promise<void> {
  header("STEP 1: DISCOVER MCP TOOLS");

  const toolsList = await client.listTools();
  const tools = toolsList.tools || [];

  console.log(`  ${GREEN}Found ${tools.length} tool(s) on the MCP server:${RESET}\n`);

  for (const tool of tools) {
    console.log(`  ${PINK}*${RESET} ${BOLD}${tool.name}${RESET}`);
    if (tool.description) {
      console.log(`    ${DIM}${tool.description}${RESET}`);
    }
    if (tool.inputSchema && typeof tool.inputSchema === "object") {
      const schema = tool.inputSchema as Record<string, any>;
      const props = schema.properties || {};
      const paramNames = Object.keys(props);
      if (paramNames.length > 0) {
        console.log(`    ${DIM}Params: ${paramNames.join(", ")}${RESET}`);
      }
    }
    console.log();
  }
}

/**
 * Step 2: Get protocol stats via MCP.
 */
async function stepGetStats(client: Client): Promise<void> {
  header("STEP 2: GET PROTOCOL STATS (via MCP)");

  const data = await callTool(client, "get_megachad_stats");
  if (!data) return;

  if (typeof data === "string") {
    console.log(`  ${data}`);
    return;
  }

  // Display stats
  const statFields: Record<string, string> = {
    totalBurned: "Total Burned",
    totalBurners: "Total Burners",
    totalBurns: "Total Burns",
    burnCount: "Burn Count",
    holders: "Holders",
    marketCap: "Market Cap",
    price: "MEGACHAD Price",
    tvl: "TVL",
  };

  for (const [key, label] of Object.entries(statFields)) {
    if (data[key] !== undefined) {
      const val = data[key];
      if (typeof val === "number") {
        info(label, key.includes("price") || key.includes("Cap") || key.includes("tvl")
          ? formatUsd(val)
          : formatNumber(val));
      } else {
        info(label, String(val));
      }
    }
  }

  // Show any extra keys
  for (const [key, val] of Object.entries(data)) {
    if (!(key in statFields) && typeof val !== "object") {
      info(key, String(val));
    }
  }
}

/**
 * Step 3: Get price via MCP.
 */
async function stepGetPrice(client: Client): Promise<void> {
  header("STEP 3: GET MEGACHAD PRICE (via MCP)");

  const data = await callTool(client, "get_price");
  if (!data) return;

  if (typeof data === "string") {
    console.log(`  ${data}`);
    return;
  }

  if (data.price || data.priceUsd) {
    info("Price (USD)", formatUsd(parseFloat(data.price || data.priceUsd)));
  }
  if (data.priceEth) {
    info("Price (ETH)", data.priceEth + " ETH");
  }
  if (data.marketCap) {
    info("Market Cap", formatUsd(parseFloat(data.marketCap)));
  }
}

/**
 * Step 4: Get wallet info via MCP.
 */
async function stepGetWalletInfo(client: Client): Promise<void> {
  header("STEP 4: GET WALLET INFO (via MCP)");
  console.log(`  ${DIM}Wallet: ${AGENT_WALLET}${RESET}\n`);

  const data = await callTool(client, "get_wallet_info", { address: AGENT_WALLET });
  if (!data) return;

  if (typeof data === "string") {
    console.log(`  ${data}`);
    return;
  }

  if (data.ethBalance || data.eth) {
    info("ETH Balance", formatNumber(parseFloat(data.ethBalance || data.eth)) + " ETH");
  }
  if (data.megachadBalance || data.megachad) {
    info("MEGACHAD Balance", formatNumber(parseFloat(data.megachadBalance || data.megachad)) + " MEGACHAD");
  }
  if (data.megagoonerBalance || data.megagooner) {
    info("MEGAGOONER Balance", formatNumber(parseFloat(data.megagoonerBalance || data.megagooner)) + " MEGAGOONER");
  }
}

/**
 * Step 5: Get looksmaxx plan via MCP.
 * This is the key agent interaction — getting a full orchestrated plan
 * with pre-built calldata, delivered through MCP tooling.
 */
async function stepGetLooksmaxxPlan(client: Client): Promise<void> {
  header("STEP 5: GET LOOKSMAXX PLAN (via MCP)");
  console.log(`  ${DIM}Wallet: ${AGENT_WALLET}${RESET}\n`);

  const data = await callTool(client, "get_looksmaxx_plan", { wallet: AGENT_WALLET });
  if (!data) return;

  if (typeof data === "string") {
    console.log(`  ${data}`);
    return;
  }

  const steps = data.plan?.steps || data.steps || [];
  if (steps.length > 0) {
    subheader(`Looksmaxx Plan: ${steps.length} step(s)`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`  ${PINK}${BOLD}Step ${i + 1}: ${step.action || step.name || "Transaction"}${RESET}`);
      if (step.description) {
        console.log(`    ${DIM}${step.description}${RESET}`);
      }
      if (step.to) {
        console.log(`    ${DIM}To:       ${step.to}${RESET}`);
      }
      if (step.data || step.calldata) {
        const cd = step.data || step.calldata;
        const preview = cd.length > 66 ? cd.slice(0, 66) + "..." : cd;
        console.log(`    ${DIM}Calldata: ${preview}${RESET}`);
      }
      console.log();

      console.log(`    ${YELLOW}// >>> MCP AGENT WOULD SIGN & BROADCAST HERE <<<${RESET}`);
      console.log(`    ${DIM}// The MCP tool returned pre-built calldata.${RESET}`);
      console.log(`    ${DIM}// A real agent would use its signer to execute.${RESET}\n`);
    }
  }

  if (data.summary || data.message) {
    subheader("Plan Summary");
    console.log(`  ${data.summary || data.message}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${PINK}${BOLD}`);
  console.log(`  ╔══════════════════════════════════════════════════════════╗`);
  console.log(`  ║                                                          ║`);
  console.log(`  ║     M E G A C H A D   M C P   A G E N T                 ║`);
  console.log(`  ║                                                          ║`);
  console.log(`  ║     Model Context Protocol Integration Demo              ║`);
  console.log(`  ║     Transport: Streamable HTTP                           ║`);
  console.log(`  ║                                                          ║`);
  console.log(`  ╚══════════════════════════════════════════════════════════╝`);
  console.log(`${RESET}`);

  console.log(`  ${DIM}MCP Server:   ${MCP_URL}${RESET}`);
  console.log(`  ${DIM}Agent Wallet: ${AGENT_WALLET}${RESET}`);
  console.log(`  ${DIM}Mode:         READ-ONLY DEMO (no transactions will be sent)${RESET}\n`);

  let client: Client;
  try {
    client = await createMcpClient();
  } catch (err: any) {
    error(`Failed to connect to MCP server: ${err.message}`);
    console.log(`\n  ${DIM}Make sure the MegaChad MCP server is running at ${MCP_URL}${RESET}`);
    console.log(`  ${DIM}The MCP server exposes the same capabilities as the REST API,${RESET}`);
    console.log(`  ${DIM}but through a standardized protocol that AI agents can discover.${RESET}\n`);
    process.exit(1);
  }

  try {
    await stepListTools(client);
    await stepGetStats(client);
    await stepGetPrice(client);
    await stepGetWalletInfo(client);
    await stepGetLooksmaxxPlan(client);

    header("MCP AGENT FLOW COMPLETE");
    console.log(`  ${GREEN}${BOLD}All MCP tool invocations completed.${RESET}\n`);
    console.log(`  ${DIM}Key advantages of MCP integration:${RESET}`);
    console.log(`  ${DIM}  * Standardized tool discovery (no hardcoded endpoints)${RESET}`);
    console.log(`  ${DIM}  * Typed input/output schemas for each tool${RESET}`);
    console.log(`  ${DIM}  * Works with any MCP-compatible AI framework${RESET}`);
    console.log(`  ${DIM}  * Same capabilities as REST API, protocol-native access${RESET}\n`);
    console.log(`  ${PINK}${BOLD}WAGMI${RESET}\n`);
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
