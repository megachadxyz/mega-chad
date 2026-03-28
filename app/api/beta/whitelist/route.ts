import { NextResponse } from 'next/server';
import {
  BETA_ADMIN_KEY,
  isWalletWhitelisted,
  addWalletToWhitelist,
  removeWalletFromWhitelist,
  getWhitelistedWallets,
} from '@/lib/beta-auth';

// Check if a wallet is whitelisted
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  return NextResponse.json({ whitelisted: isWalletWhitelisted(address) });
}

// Admin: add or remove wallets
export async function POST(request: Request) {
  try {
    const { adminKey, action, address } = await request.json();

    if (!BETA_ADMIN_KEY || adminKey !== BETA_ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    if (action === 'add') {
      const success = addWalletToWhitelist(address);
      if (!success) {
        return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
      }
      return NextResponse.json({ added: true, address: address.toLowerCase() });
    }

    if (action === 'remove') {
      const removed = removeWalletFromWhitelist(address);
      return NextResponse.json({ removed, address: address.toLowerCase() });
    }

    if (action === 'list') {
      return NextResponse.json({ wallets: getWhitelistedWallets() });
    }

    return NextResponse.json({ error: 'Invalid action. Use: add, remove, list' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
