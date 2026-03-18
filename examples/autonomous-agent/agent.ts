/**
 * MegaChad Autonomous Agent — Discovery & Planning Demo
 *
 * This script demonstrates the full flow an AI agent would use to
 * autonomously interact with the MegaChad burn-to-create looksmaxxing
 * engine on MegaETH (chain ID 4326).
 *
 * It does NOT sign or send transactions — it shows how an agent would
 * discover capabilities, check state, get a plan, and prepare calldata.
 *
 * Usage:
 *   AGENT_WALLET=0x... npx ts-node agent.ts
 */

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

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// ─── Config ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://megachad.xyz";
const CHAIN_ID = 4326;
const RPC_URL = "https://mainnet.megaeth.com/rpc";

// Default demo wallet — override with AGENT_WALLET env var
const AGENT_WALLET =
  process.env.AGENT_WALLET || "0x000000000000000000000000000000000000dEaD";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchJson<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      warn(`HTTP ${res.status} from ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err: any) {
    error(`Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Step implementations ───────────────────────────────────────────────────

/**
 * Step 1: Discover — Fetch the agent card to learn what MegaChad can do.
 * An autonomous agent uses this to understand available skills before acting.
 */
async function stepDiscover(): Promise<any> {
  header("STEP 1: DISCOVER AGENT CAPABILITIES");
  console.log(`  ${DIM}Fetching agent card from ${BASE_URL}/.well-known/agent.json${RESET}`);

  const card = await fetchJson(`${BASE_URL}/.well-known/agent.json`);
  if (!card) {
    error("Could not fetch agent card. The agent cannot proceed without discovery.");
    return null;
  }

  info("Agent Name", card.name || "MegaChad");
  info("Description", card.description || "N/A");

  if (card.capabilities?.skills) {
    subheader("Available Skills");
    for (const skill of card.capabilities.skills) {
      console.log(`  ${PINK}*${RESET} ${BOLD}${skill.name || skill.id}${RESET}`);
      if (skill.description) {
        console.log(`    ${DIM}${skill.description}${RESET}`);
      }
      if (skill.endpoint) {
        console.log(`    ${DIM}Endpoint: ${skill.endpoint}${RESET}`);
      }
    }
  }

  if (card.capabilities?.mcp) {
    subheader("MCP Server");
    info("URL", card.capabilities.mcp.url || card.capabilities.mcp.endpoint || "N/A");
    info("Transport", card.capabilities.mcp.transport || "streamable-http");
  }

  return card;
}

/**
 * Step 2: Check wallet — Query on-chain balances for the agent wallet.
 * The agent needs to know its ETH and MEGACHAD balances to decide next steps.
 */
async function stepCheckWallet(): Promise<any> {
  header("STEP 2: CHECK AGENT WALLET");
  console.log(`  ${DIM}Wallet: ${AGENT_WALLET}${RESET}`);
  console.log(`  ${DIM}Chain:  MegaETH (ID ${CHAIN_ID})${RESET}`);
  console.log(`  ${DIM}RPC:    ${RPC_URL}${RESET}\n`);

  const data = await fetchJson(`${BASE_URL}/api/wallet?address=${AGENT_WALLET}`);
  if (!data) {
    warn("Could not fetch wallet data. Agent may need to use RPC directly.");
    return null;
  }

  info("ETH Balance", formatNumber(parseFloat(data.ethBalance || data.eth || "0")) + " ETH");
  info("MEGACHAD Balance", formatNumber(parseFloat(data.megachadBalance || data.megachad || "0")) + " MEGACHAD");
  if (data.megagoonerBalance || data.megagooner) {
    info("MEGAGOONER Balance", formatNumber(parseFloat(data.megagoonerBalance || data.megagooner || "0")) + " MEGAGOONER");
  }

  return data;
}

/**
 * Step 3: Get price — Fetch current MEGACHAD token price.
 * The agent uses this to evaluate whether to buy more or burn existing tokens.
 */
async function stepGetPrice(): Promise<any> {
  header("STEP 3: GET MEGACHAD PRICE");

  const data = await fetchJson(`${BASE_URL}/api/price`);
  if (!data) {
    warn("Could not fetch price data.");
    return null;
  }

  info("Price (USD)", formatUsd(parseFloat(data.price || data.priceUsd || "0")));
  if (data.priceEth) {
    info("Price (ETH)", data.priceEth + " ETH");
  }
  if (data.marketCap) {
    info("Market Cap", formatUsd(parseFloat(data.marketCap)));
  }
  if (data.change24h !== undefined) {
    const change = parseFloat(data.change24h);
    const color = change >= 0 ? GREEN : RED;
    console.log(`  ${DIM}24h Change:${RESET} ${color}${change >= 0 ? "+" : ""}${change.toFixed(2)}%${RESET}`);
  }

  return data;
}

/**
 * Step 4: Get swap quote — If the agent doesn't have enough MEGACHAD,
 * it needs to swap ETH for MEGACHAD. This fetches a quote.
 */
async function stepGetSwapQuote(): Promise<any> {
  header("STEP 4: GET SWAP QUOTE (ETH -> MEGACHAD)");

  const ethAmount = "0.1";
  console.log(`  ${DIM}Requesting quote for ${ethAmount} ETH -> MEGACHAD${RESET}\n`);

  const data = await fetchJson(`${BASE_URL}/api/x402/quote?ethAmount=${ethAmount}`);
  if (!data) {
    warn("Could not fetch swap quote. The agent may need to use a DEX directly.");
    return null;
  }

  info("ETH In", ethAmount + " ETH");
  if (data.megachadOut || data.amountOut || data.tokensOut) {
    info("MEGACHAD Out", formatNumber(parseFloat(data.megachadOut || data.amountOut || data.tokensOut)) + " MEGACHAD");
  }
  if (data.priceImpact) {
    info("Price Impact", data.priceImpact + "%");
  }
  if (data.route) {
    info("Route", data.route);
  }

  console.log(`\n  ${DIM}// An autonomous agent would sign and send a swap transaction here.${RESET}`);
  console.log(`  ${DIM}// The quote provides the calldata needed for the DEX interaction.${RESET}`);

  return data;
}

/**
 * Step 5: Get looksmaxx plan — The core endpoint. Returns a full orchestrated
 * burn plan with pre-built calldata for each step. This is what makes MegaChad
 * agent-native: the protocol gives the agent everything it needs to execute.
 */
async function stepGetLooksmaxxPlan(): Promise<any> {
  header("STEP 5: GET LOOKSMAXX PLAN");
  console.log(`  ${DIM}Fetching orchestrated burn plan for ${truncateAddress(AGENT_WALLET)}${RESET}\n`);

  const data = await fetchJson(`${BASE_URL}/api/agent/looksmaxx?wallet=${AGENT_WALLET}`);
  if (!data) {
    warn("Could not fetch looksmaxx plan.");
    return null;
  }

  if (data.plan || data.steps) {
    const steps = data.plan?.steps || data.steps || [];
    subheader(`Plan: ${steps.length} step(s)`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`  ${PINK}${BOLD}Step ${i + 1}: ${step.action || step.name || "Transaction"}${RESET}`);
      if (step.description) {
        console.log(`    ${DIM}${step.description}${RESET}`);
      }
      if (step.to) {
        console.log(`    ${DIM}To:       ${step.to}${RESET}`);
      }
      if (step.value) {
        console.log(`    ${DIM}Value:    ${step.value}${RESET}`);
      }
      if (step.data || step.calldata) {
        const cd = step.data || step.calldata;
        const preview = cd.length > 66 ? cd.slice(0, 66) + "..." : cd;
        console.log(`    ${DIM}Calldata: ${preview}${RESET}`);
      }
      if (step.gas || step.gasLimit) {
        console.log(`    ${DIM}Gas:      ${step.gas || step.gasLimit}${RESET}`);
      }
      console.log();

      // ── This is where a real agent would sign and send ──
      console.log(`    ${YELLOW}// >>> AUTONOMOUS AGENT WOULD SIGN & SEND THIS TX <<<${RESET}`);
      console.log(`    ${DIM}// const tx = await wallet.sendTransaction({${RESET}`);
      console.log(`    ${DIM}//   to: "${step.to || '0x...'}",${RESET}`);
      console.log(`    ${DIM}//   data: "${(step.data || step.calldata || '0x...').slice(0, 20)}...",${RESET}`);
      console.log(`    ${DIM}//   value: ${step.value || '0'},${RESET}`);
      console.log(`    ${DIM}//   chainId: ${CHAIN_ID}${RESET}`);
      console.log(`    ${DIM}// });${RESET}`);
      console.log(`    ${DIM}// await tx.wait();${RESET}\n`);
    }
  } else {
    // Display whatever the endpoint returned
    info("Response", JSON.stringify(data, null, 2));
  }

  if (data.summary || data.message) {
    subheader("Plan Summary");
    console.log(`  ${data.summary || data.message}`);
  }

  return data;
}

/**
 * Step 6: Check gasless burn — Some wallets may qualify for a gasless
 * (meta-transaction) burn, sponsored by the protocol.
 */
async function stepCheckGasless(): Promise<any> {
  header("STEP 6: CHECK GASLESS BURN OPTION");
  console.log(`  ${DIM}Checking if gasless burn is available for ${truncateAddress(AGENT_WALLET)}${RESET}\n`);

  const data = await fetchJson(`${BASE_URL}/api/gasless/burn?address=${AGENT_WALLET}`);
  if (!data) {
    warn("Could not check gasless burn availability.");
    return null;
  }

  if (data.eligible !== undefined) {
    if (data.eligible) {
      console.log(`  ${GREEN}${BOLD}Gasless burn is AVAILABLE!${RESET}`);
      if (data.reason) info("Reason", data.reason);
      if (data.sponsor) info("Sponsor", data.sponsor);
    } else {
      console.log(`  ${YELLOW}Gasless burn is NOT available for this wallet.${RESET}`);
      if (data.reason) info("Reason", data.reason);
    }
  } else {
    info("Response", JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Step 7: Check leaderboard — View the top burners on the Chadboard.
 * The agent can use this to understand competitive positioning.
 */
async function stepCheckLeaderboard(): Promise<any> {
  header("STEP 7: CHADBOARD (LEADERBOARD)");

  const data = await fetchJson(`${BASE_URL}/api/chadboard`);
  if (!data) {
    warn("Could not fetch leaderboard.");
    return null;
  }

  const entries = Array.isArray(data) ? data : data.leaderboard || data.entries || data.burners || [];

  if (entries.length > 0) {
    console.log(`  ${DIM}${"#".padEnd(4)} ${"Address".padEnd(16)} ${"Burned".padStart(18)}${RESET}`);
    console.log(`  ${DIM}${"─".repeat(42)}${RESET}`);

    const top = entries.slice(0, 10);
    for (let i = 0; i < top.length; i++) {
      const e = top[i];
      const rank = `${i + 1}.`.padEnd(4);
      const addr = truncateAddress(e.address || e.wallet || e.burner || "???").padEnd(16);
      const burned = formatNumber(parseFloat(e.amount || e.burned || e.totalBurned || "0")).padStart(18);
      const color = i === 0 ? PINK : i < 3 ? CYAN : RESET;
      console.log(`  ${color}${rank} ${addr} ${burned} MEGACHAD${RESET}`);
    }
  } else {
    info("Entries", "No leaderboard data available");
  }

  return data;
}

/**
 * Step 8: Get protocol stats — Overall protocol statistics.
 */
async function stepGetStats(): Promise<any> {
  header("STEP 8: PROTOCOL STATS");

  const data = await fetchJson(`${BASE_URL}/api/stats`);
  if (!data) {
    warn("Could not fetch protocol stats.");
    return null;
  }

  // Display all available stats dynamically
  const display: Record<string, string> = {
    totalBurned: "Total Burned",
    totalBurners: "Total Burners",
    totalBurns: "Total Burns",
    burnCount: "Burn Count",
    megagoonerSupply: "MEGAGOONER Supply",
    megagoonerMinted: "MEGAGOONER Minted",
    holders: "Holders",
    marketCap: "Market Cap",
    price: "MEGACHAD Price",
    tvl: "TVL",
    volume24h: "24h Volume",
  };

  for (const [key, label] of Object.entries(display)) {
    if (data[key] !== undefined) {
      const val = data[key];
      if (typeof val === "number") {
        info(label, key.includes("price") || key.includes("Cap") || key.includes("tvl") || key.includes("volume")
          ? formatUsd(val)
          : formatNumber(val));
      } else {
        info(label, String(val));
      }
    }
  }

  // Show any remaining keys we haven't mapped
  for (const [key, val] of Object.entries(data)) {
    if (!(key in display) && typeof val !== "object") {
      info(key, String(val));
    }
  }

  return data;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${PINK}${BOLD}`);
  console.log(`  ╔══════════════════════════════════════════════════════════╗`);
  console.log(`  ║                                                          ║`);
  console.log(`  ║     M E G A C H A D   A U T O N O M O U S   A G E N T   ║`);
  console.log(`  ║                                                          ║`);
  console.log(`  ║     Burn-to-Create Looksmaxxing Engine on MegaETH        ║`);
  console.log(`  ║     Chain ID: ${CHAIN_ID}  |  Agent Demo (read-only)          ║`);
  console.log(`  ║                                                          ║`);
  console.log(`  ╚══════════════════════════════════════════════════════════╝`);
  console.log(`${RESET}`);

  console.log(`  ${DIM}Agent Wallet: ${AGENT_WALLET}${RESET}`);
  console.log(`  ${DIM}Base URL:     ${BASE_URL}${RESET}`);
  console.log(`  ${DIM}Network:      MegaETH (${CHAIN_ID})${RESET}`);
  console.log(`  ${DIM}Mode:         READ-ONLY DEMO (no transactions will be sent)${RESET}`);

  // Execute each step sequentially with a brief pause for readability
  await stepDiscover();
  await sleep(300);

  await stepCheckWallet();
  await sleep(300);

  await stepGetPrice();
  await sleep(300);

  await stepGetSwapQuote();
  await sleep(300);

  await stepGetLooksmaxxPlan();
  await sleep(300);

  await stepCheckGasless();
  await sleep(300);

  await stepCheckLeaderboard();
  await sleep(300);

  await stepGetStats();

  // Final summary
  header("AGENT FLOW COMPLETE");
  console.log(`  ${GREEN}${BOLD}All discovery and planning steps completed successfully.${RESET}\n`);
  console.log(`  ${DIM}A fully autonomous agent would now:${RESET}`);
  console.log(`  ${DIM}  1. Evaluate balances against the looksmaxx plan requirements${RESET}`);
  console.log(`  ${DIM}  2. Swap ETH -> MEGACHAD if needed (using the quote calldata)${RESET}`);
  console.log(`  ${DIM}  3. Approve MEGACHAD spending (using the approval calldata)${RESET}`);
  console.log(`  ${DIM}  4. Execute the burn transaction (using the burn calldata)${RESET}`);
  console.log(`  ${DIM}  5. Claim MEGAGOONER rewards after burn${RESET}`);
  console.log(`  ${DIM}  6. Optionally stake MEGAGOONER for governance power${RESET}`);
  console.log(`  ${DIM}  7. Monitor the Chadboard for competitive positioning${RESET}\n`);

  console.log(`  ${PINK}${BOLD}WAGMI${RESET}\n`);
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
