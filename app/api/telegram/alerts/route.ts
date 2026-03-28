import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, parseAbiItem } from 'viem';
import { megaeth } from '@/lib/wagmi';
import { MEGACHAD_ADDRESS, BURN_ADDRESS } from '@/lib/contracts';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ── Config ───────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';
const ALERT_SECRET = process.env.TELEGRAM_ALERT_SECRET || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const PAIR_ADDRESS = '0x1c08a462e50532640441b4fc64385e610ba3a78d' as `0x${string}`;
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as `0x${string}`;
const TOTAL_SUPPLY = 1_000_000_000;
const DEXSCREENER_URL = 'https://dexscreener.com/megaeth/0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888';

const REDIS_KEY_LAST_BLOCK = 'telegram:alerts:lastBlock';

// ── ABI fragments ────────────────────────────────────────────────────────────

const transferEvent = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

const swapEvent = parseAbiItem(
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
);

const token0Abi = parseAbiItem('function token0() external view returns (address)');

// ── Helpers ──────────────────────────────────────────────────────────────────

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');
  return new Redis({ url, token });
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function sendTelegram(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHANNEL_ID) return;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHANNEL_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
}

// ── Main alert logic ─────────────────────────────────────────────────────────

/**
 * GET /api/telegram/alerts?secret=...
 *
 * Checks for new burn and buy events since last run and sends alerts to Telegram.
 * Call this from an external cron (e.g. cron-job.org every 10-30s).
 */
export async function GET(req: NextRequest) {
  // Auth check
  const secret = req.nextUrl.searchParams.get('secret');
  if (!ALERT_SECRET || secret !== ALERT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!BOT_TOKEN || !CHANNEL_ID) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  const redis = getRedis();
  const currentBlock = await viemClient.getBlockNumber();

  // Get last processed block from Redis
  let lastBlock = await redis.get<number>(REDIS_KEY_LAST_BLOCK);
  if (!lastBlock || lastBlock >= Number(currentBlock)) {
    // First run or no new blocks — start from current block
    if (!lastBlock) {
      await redis.set(REDIS_KEY_LAST_BLOCK, Number(currentBlock));
    }
    return NextResponse.json({ status: 'no_new_blocks', currentBlock: Number(currentBlock) });
  }

  // Cap range to avoid scanning too many blocks at once
  const fromBlock = BigInt(lastBlock + 1);
  const toBlock = currentBlock;
  const maxRange = 5000n;
  const effectiveTo = toBlock - fromBlock > maxRange ? fromBlock + maxRange : toBlock;

  let burnsSent = 0;
  let buysSent = 0;

  try {
    // ── Detect burns (Transfer → dead address) ────────────────────────────
    const burnLogs = await viemClient.getLogs({
      address: MEGACHAD_ADDRESS,
      event: transferEvent,
      args: { to: BURN_ADDRESS },
      fromBlock,
      toBlock: effectiveTo,
    });

    // Get total burned for stats
    const deadBalance = await viemClient.readContract({
      address: MEGACHAD_ADDRESS,
      abi: [{ type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
      functionName: 'balanceOf',
      args: [BURN_ADDRESS],
    });
    const totalBurned = Number(formatUnits(deadBalance as bigint, 18));
    const percentBurned = ((totalBurned / TOTAL_SUPPLY) * 100).toFixed(2);

    for (const log of burnLogs) {
      const from = log.args.from as string;
      const value = log.args.value as bigint;
      const burnAmount = Number(formatUnits(value, 18));
      const txHash = log.transactionHash;
      const explorerUrl = `https://megaexplorer.xyz/tx/${txHash}`;

      const message = [
        `🔥 <b>BURN ALERT</b> 🔥`,
        ``,
        `<b>${fmt(burnAmount)} $MEGACHAD BURNED!</b>`,
        ``,
        `Wallet: <code>${shortAddr(from)}</code>`,
        `Block: ${log.blockNumber}`,
        ``,
        `📊 <b>Total Stats:</b>`,
        `💰 Total Burned: ${fmt(totalBurned)} $MEGACHAD`,
        `📉 % of Supply Burned: ${percentBurned}%`,
        ``,
        `<a href="${explorerUrl}">View Transaction</a>`,
      ].join('\n');

      await sendTelegram(message);
      burnsSent++;
    }

    // ── Detect buys (Swap events on pair) ─────────────────────────────────
    const token0 = await viemClient.readContract({
      address: PAIR_ADDRESS,
      abi: [token0Abi],
      functionName: 'token0',
    }) as string;
    const wethIsToken0 = token0.toLowerCase() === WETH_ADDRESS.toLowerCase();

    const swapLogs = await viemClient.getLogs({
      address: PAIR_ADDRESS,
      event: swapEvent,
      fromBlock,
      toBlock: effectiveTo,
    });

    // Fetch ETH price and market cap once for all buys
    let ethPriceUSD = 0;
    let marketCap = 0;
    try {
      const [ethRes, pairRes] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'),
        fetch(`https://api.dexscreener.com/latest/dex/pairs/megaeth/${PAIR_ADDRESS}`),
      ]);
      const ethData = await ethRes.json();
      ethPriceUSD = ethData.ethereum?.usd || 0;
      const pairData = await pairRes.json();
      if (pairData.pair) {
        marketCap = parseFloat(pairData.pair.marketCap || pairData.pair.fdv || 0);
      }
    } catch {
      // Non-critical — continue without price data
    }

    for (const log of swapLogs) {
      const recipient = log.args.recipient as string;
      const amount0 = log.args.amount0 as bigint;
      const amount1 = log.args.amount1 as bigint;

      let ethIn = 0;
      if (wethIsToken0) {
        if (amount0 > 0n && amount1 < 0n) {
          ethIn = Number(formatUnits(amount0, 18));
        }
      } else {
        if (amount1 > 0n && amount0 < 0n) {
          ethIn = Number(formatUnits(amount1, 18));
        }
      }

      if (ethIn <= 0) continue;

      const usdValue = ethIn * ethPriceUSD;
      const txHash = log.transactionHash;
      const explorerUrl = `https://megaexplorer.xyz/tx/${txHash}`;

      // Fire emojis based on buy size
      let fireEmojis = '🔥';
      if (usdValue >= 1000) fireEmojis = '🔥🔥🔥🔥🔥';
      else if (usdValue >= 500) fireEmojis = '🔥🔥🔥🔥';
      else if (usdValue >= 100) fireEmojis = '🔥🔥🔥';
      else if (usdValue >= 50) fireEmojis = '🔥🔥';

      const message = [
        `$MEGACHAD New Buy! 💎`,
        fireEmojis,
        ``,
        `💵 ${ethIn.toFixed(4)} ETH${usdValue > 0 ? ` ($${usdValue.toFixed(2)})` : ''}`,
        `👤 <a href="${explorerUrl}">Tx</a> | <code>${shortAddr(recipient)}</code>`,
        `📊 MC: ${marketCap > 0 ? `$${fmt(marketCap)}` : 'N/A'}`,
        ``,
        `<a href="${DEXSCREENER_URL}">📈 Chart</a>`,
      ].join('\n');

      await sendTelegram(message);
      buysSent++;
    }
  } catch (err) {
    console.error('[Telegram Alerts] Error:', err);
    // Still update lastBlock to avoid reprocessing on next call
  }

  // Update last processed block
  await redis.set(REDIS_KEY_LAST_BLOCK, Number(effectiveTo));

  return NextResponse.json({
    status: 'ok',
    scanned: { from: Number(fromBlock), to: Number(effectiveTo) },
    alerts: { burns: burnsSent, buys: buysSent },
  });
}
