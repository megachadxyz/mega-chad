import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet } from '@/lib/wagmi';
import { isWalletWhitelisted } from '@/lib/beta-auth';
import {
  TESTNET_MEGACHAD_ADDRESS,
  TESTNET_MEGAGOONER_ADDRESS,
  ERC20_ABI,
} from '@/lib/testnet-contracts';

// Faucet drips from the Tren Fund wallet
// Set TREN_FUND_PRIVATE_KEY in Vercel env vars
const TREN_FUND_PRIVATE_KEY = process.env.TREN_FUND_PRIVATE_KEY as `0x${string}` | undefined;

// Drip amounts per 24h per wallet (enough for burns, staking, and protocol testing)
const MEGACHAD_DRIP = parseUnits('500000', 18);
const MEGAGOONER_DRIP = parseUnits('5000', 18);

// Cooldown: 1 drip per token per address per 24 hours (in-memory, resets on cold start)
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const { address, token } = await request.json();

    if (!address || typeof address !== 'string' || !address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
    }

    if (!token || !['megachad', 'megagooner'].includes(token)) {
      return NextResponse.json({ error: 'Token must be "megachad" or "megagooner"' }, { status: 400 });
    }

    // Whitelist check
    if (!isWalletWhitelisted(address)) {
      return NextResponse.json({ error: 'Wallet not whitelisted' }, { status: 403 });
    }

    // Tren fund wallet check
    if (!TREN_FUND_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Faucet not configured. Set TREN_FUND_PRIVATE_KEY.' }, { status: 503 });
    }

    // Cooldown check (per token per address)
    const cooldownKey = `${address.toLowerCase()}-${token}`;
    const lastDrip = cooldowns.get(cooldownKey);
    if (lastDrip && Date.now() - lastDrip < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastDrip)) / 3600000);
      return NextResponse.json({ error: `Cooldown active. Try again in ~${remaining}h` }, { status: 429 });
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

    // Set cooldown
    cooldowns.set(cooldownKey, Date.now());

    // Cap map size
    if (cooldowns.size > 5000) {
      const cutoff = Date.now() - COOLDOWN_MS;
      for (const [k, v] of cooldowns) {
        if (v < cutoff) cooldowns.delete(k);
      }
    }

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
