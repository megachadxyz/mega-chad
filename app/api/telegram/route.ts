import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const BASE_URL = 'https://megachad.xyz';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

/** Escape special chars for Telegram MarkdownV2 */
function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    }),
  });
}

async function sendPhoto(chatId: number, photoUrl: string, caption: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'MarkdownV2',
    }),
  });
}

async function apiFetch(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

// ── Command handlers ─────────────────────────────────────────────────────────

async function handleStart(chatId: number): Promise<void> {
  const text = [
    esc('Welcome to the MegaChad Bot') + ' ' + esc('(') + esc(')'),
    '',
    esc('Burn-to-create looksmaxxing engine on MegaETH.'),
    '',
    esc('Available commands:'),
    esc('/stats - Token statistics'),
    esc('/price - Current $MEGACHAD price'),
    esc('/gallery - Latest looksmaxxed images'),
    esc('/leaderboard - Top burners'),
    esc('/wallet <address> - Check wallet'),
    esc('/bridge - How to bridge to MegaETH'),
    esc('/help - Show this message'),
    '',
    esc('Website: megachad.xyz'),
  ].join('\n');
  await sendMessage(chatId, text);
}

async function handleStats(chatId: number): Promise<void> {
  try {
    const data = await apiFetch('/api/stats');
    const text = [
      esc('$MEGACHAD Token Stats'),
      '',
      esc('Total Supply: ') + esc(fmt(data.totalSupply)),
      esc('Tokens Burned: ') + esc(fmt(data.tokensBurned)),
      esc('Circulating: ') + esc(fmt(data.circulatingSupply)),
      esc('Total Burns: ') + esc(fmt(data.totalBurns)),
      '',
      esc('megachad.xyz'),
    ].join('\n');
    await sendMessage(chatId, text);
  } catch {
    await sendMessage(chatId, esc('Failed to fetch stats. Try again later.'));
  }
}

async function handlePrice(chatId: number): Promise<void> {
  try {
    const data = await apiFetch('/api/price');
    const price = data.price;
    const burn = data.burnCost;

    const ethPerMegachad = price?.ethPerMegachad
      ? Number(price.ethPerMegachad).toFixed(10)
      : 'N/A';
    const megachadPerEth = price?.megachadPerEth
      ? fmt(Math.floor(price.megachadPerEth))
      : 'N/A';
    const burnCost = burn?.estimatedEth
      ? Number(burn.estimatedEth).toFixed(6)
      : 'N/A';

    const text = [
      esc('$MEGACHAD Price'),
      '',
      esc(`1 $MEGACHAD = ${ethPerMegachad} ETH`),
      esc(`1 ETH = ${megachadPerEth} $MEGACHAD`),
      '',
      esc('Burn Cost:'),
      esc(`${fmt(burn?.tokensRequired)} $MEGACHAD = ~${burnCost} ETH`),
      esc(`+ ${burn?.infraFeeUsdm || 1} USDm infra fee`),
      '',
      esc(`DEX: ${data.pool?.dex || 'Kumbaya'} (${data.pool?.pair || 'MEGACHAD/WETH'})`),
    ].join('\n');
    await sendMessage(chatId, text);
  } catch {
    await sendMessage(chatId, esc('Failed to fetch price. Try again later.'));
  }
}

async function handleGallery(chatId: number): Promise<void> {
  try {
    const data = await apiFetch('/api/gallery?limit=3');
    const burns = data.burns || [];

    if (burns.length === 0) {
      await sendMessage(chatId, esc('No looksmaxxed images yet. Be the first at megachad.xyz'));
      return;
    }

    await sendMessage(chatId, esc('Latest Looksmaxxed Burns:'));

    for (const burn of burns) {
      const imageUrl = burn.ipfsUrl || burn.image || burn.imageUrl || '';
      const gateway = imageUrl
        .replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
        .replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');

      const burner = burn.burner || burn.address || 'Unknown';
      const caption = esc(`Burned by ${shortAddr(burner)}`);

      if (gateway && gateway.startsWith('http')) {
        try {
          await sendPhoto(chatId, gateway, caption);
        } catch {
          await sendMessage(chatId, caption + '\n' + esc(gateway));
        }
      } else {
        await sendMessage(chatId, caption);
      }
    }
  } catch {
    await sendMessage(chatId, esc('Failed to fetch gallery. Try again later.'));
  }
}

async function handleLeaderboard(chatId: number): Promise<void> {
  try {
    const data = await apiFetch('/api/chadboard');
    const entries = (data.entries || []).slice(0, 5);

    if (entries.length === 0) {
      await sendMessage(chatId, esc('No burners on the chadboard yet.'));
      return;
    }

    const medals = ['1.', '2.', '3.', '4.', '5.'];
    const lines = [esc('Top 5 Burners'), ''];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const name = e.megaName ? `${e.megaName}.mega` : shortAddr(e.address);
      lines.push(esc(`${medals[i]} ${name} - ${e.totalBurns} burns (${fmt(e.totalBurned)} $MEGACHAD)`));
    }

    lines.push('');
    lines.push(esc('megachad.xyz'));

    await sendMessage(chatId, lines.join('\n'));
  } catch {
    await sendMessage(chatId, esc('Failed to fetch leaderboard. Try again later.'));
  }
}

async function handleWallet(chatId: number, address: string): Promise<void> {
  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    await sendMessage(chatId, esc('Please provide a valid Ethereum address.\nUsage: /wallet 0x...'));
    return;
  }

  try {
    const data = await apiFetch(`/api/wallet?address=${address}`);
    const bal = data.balances;
    const burn = data.burnEligibility;
    const ea = data.earlyAccess;

    const lines = [
      esc(`Wallet: ${shortAddr(address)}`),
      '',
      esc(`ETH: ${Number(bal.eth).toFixed(6)}`),
      esc(`$MEGACHAD: ${fmt(bal.megachad)}`),
      esc(`Looksmaxxed NFTs: ${bal.looksmaxxedNFTs}`),
      '',
      esc('Burn Status:'),
      burn.canBurn ? esc('Ready to burn!') : esc(burn.message),
      '',
      esc('Early Access:'),
      ea.instantAccess ? esc('Instant access granted') : ea.referralPath ? esc('Eligible via referral') : esc('Not eligible yet'),
    ];

    await sendMessage(chatId, lines.join('\n'));
  } catch {
    await sendMessage(chatId, esc('Failed to fetch wallet info. Check the address and try again.'));
  }
}

async function handleBridge(chatId: number): Promise<void> {
  try {
    const data = await apiFetch('/api/bridge');
    const bridges = data.bridges || [];

    const lines = [
      esc('Bridge to MegaETH'),
      '',
    ];

    for (const b of bridges) {
      lines.push(esc(`${b.name}`));
      lines.push(esc(`${b.url}`));
      lines.push(esc(`From: ${b.from.join(', ')}`));
      lines.push(esc(`Assets: ${b.assets.join(', ')}`));
      lines.push('');
    }

    const flow = data.flow;
    if (flow) {
      lines.push(esc('How to looksmaxx:'));
      lines.push(esc(`1. ${flow.step1}`));
      lines.push(esc(`2. Swap ETH for $MEGACHAD on Kumbaya DEX`));
      lines.push(esc(`3. Head to megachad.xyz and burn`));
    }

    await sendMessage(chatId, lines.join('\n'));
  } catch {
    await sendMessage(chatId, esc('Failed to fetch bridge info. Try again later.'));
  }
}

async function handleHelp(chatId: number): Promise<void> {
  await handleStart(chatId);
}

async function handleUnknown(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    esc('Unknown command. Type /help to see available commands.'),
  );
}

// ── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;

    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const [command, ...args] = text.split(/\s+/);
    const cmd = command.toLowerCase().replace(/@\w+$/, ''); // strip @botname

    switch (cmd) {
      case '/start':
        await handleStart(chatId);
        break;
      case '/stats':
        await handleStats(chatId);
        break;
      case '/price':
        await handlePrice(chatId);
        break;
      case '/gallery':
        await handleGallery(chatId);
        break;
      case '/leaderboard':
        await handleLeaderboard(chatId);
        break;
      case '/wallet':
        await handleWallet(chatId, args[0] || '');
        break;
      case '/bridge':
        await handleBridge(chatId);
        break;
      case '/help':
        await handleHelp(chatId);
        break;
      default:
        if (text.startsWith('/')) {
          await handleUnknown(chatId);
        }
        break;
    }
  } catch (err) {
    console.error('[Telegram Bot] Error processing update:', err);
  }

  // Always return 200 to prevent Telegram retries
  return NextResponse.json({ ok: true });
}
