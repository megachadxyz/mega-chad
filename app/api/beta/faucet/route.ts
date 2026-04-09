import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet } from '@/lib/wagmi';
import { isWalletWhitelisted } from '@/lib/beta-auth';
import {
  TESTNET_MEGACHAD_ADDRESS,
  TESTNET_MEGAGOONER_ADDRESS,
  TESTNET_USDM_ADDRESS,
  ERC20_ABI,
  MOCK_USDM_ABI,
} from '@/lib/testnet-contracts';

// Faucet drips from the Tren Fund wallet
// Set TREN_FUND_PRIVATE_KEY in Vercel env vars
const TREN_FUND_PRIVATE_KEY = process.env.TREN_FUND_PRIVATE_KEY as `0x${string}` | undefined;

// Drip amounts per 24h per wallet (enough for burns, staking, and protocol testing)
const MEGACHAD_DRIP = parseUnits('500000', 18);
const MEGAGOONER_DRIP = parseUnits('5000', 18);
const USDM_DRIP = parseUnits('1000', 18);

// Cooldown: 1 drip per token per address per 24 hours
// Persisted in Upstash Redis so it survives serverless cold starts
const COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours

async function getCooldownRemaining(key: string): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return 0; // If Redis not configured, no cooldown enforcement

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['TTL', key]),
    cache: 'no-store',
  });
  if (!res.ok) return 0;
  const { result } = await res.json();
  // TTL returns -2 (key doesn't exist) or -1 (no expiry) or positive seconds
  return typeof result === 'number' && result > 0 ? result : 0;
}

async function setCooldown(key: string): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, Date.now().toString(), 'EX', COOLDOWN_SECONDS]),
    cache: 'no-store',
  });
}

export async function POST(request: Request) {
  try {
    const { address, token } = await request.json();

    if (!address || typeof address !== 'string' || !address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
    }

    if (!token || !['megachad', 'megagooner', 'usdm'].includes(token)) {
      return NextResponse.json({ error: 'Token must be "megachad", "megagooner", or "usdm"' }, { status: 400 });
    }

    // Whitelist check
    if (!isWalletWhitelisted(address)) {
      return NextResponse.json({ error: 'Wallet not whitelisted' }, { status: 403 });
    }

    // Tren fund wallet check
    if (!TREN_FUND_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Faucet not configured. Set TREN_FUND_PRIVATE_KEY.' }, { status: 503 });
    }

    // Cooldown check (per token per address, persisted in Redis)
    const cooldownKey = `faucet:cooldown:${address.toLowerCase()}:${token}`;
    const remainingSeconds = await getCooldownRemaining(cooldownKey);
    if (remainingSeconds > 0) {
      const remainingHours = Math.ceil(remainingSeconds / 3600);
      return NextResponse.json({ error: `Cooldown active. Try again in ~${remainingHours}h` }, { status: 429 });
    }

    const account = privateKeyToAccount(TREN_FUND_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: megaethTestnet,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: megaethTestnet,
      transport: http(),
    });

    // USDm uses mint (no faucet balance needed), others use transfer
    if (token === 'usdm') {
      const hash = await walletClient.writeContract({
        address: TESTNET_USDM_ADDRESS,
        abi: MOCK_USDM_ABI,
        functionName: 'mint',
        args: [address as `0x${string}`, USDM_DRIP],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await setCooldown(cooldownKey);
      return NextResponse.json({ success: true, hash, amount: '1,000', token: '$USDm' });
    }

    const tokenAddress = token === 'megachad' ? TESTNET_MEGACHAD_ADDRESS : TESTNET_MEGAGOONER_ADDRESS;
    const amount = token === 'megachad' ? MEGACHAD_DRIP : MEGAGOONER_DRIP;

    // Check tren fund balance
    const faucetBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    if (faucetBalance < amount) {
      return NextResponse.json({ error: 'Faucet depleted. Contact team.' }, { status: 503 });
    }

    // Send tokens from tren fund
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [address as `0x${string}`, amount],
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash });

    // Set 24h cooldown in Redis (auto-expires)
    await setCooldown(cooldownKey);

    return NextResponse.json({
      success: true,
      hash,
      amount: token === 'megachad' ? '500,000' : '5,000',
      token: token === 'megachad' ? '$MEGACHAD' : '$MEGAGOONER',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Faucet error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
