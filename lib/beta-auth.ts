// Beta access password (set via env var, fallback for development)
export const BETA_PASSWORD = process.env.BETA_ACCESS_PASSWORD || 'megachad-beta-2026';

// Admin key for managing whitelist
export const BETA_ADMIN_KEY = process.env.BETA_ADMIN_KEY || '';

// In-memory whitelist (persists per serverless instance)
// In production, this would be backed by Redis or a database
const walletWhitelist = new Set<string>([
  // Add default whitelisted wallets here (lowercase)
  // e.g. '0x1234...'.toLowerCase()
]);

// Load initial whitelist from env (comma-separated addresses)
if (process.env.BETA_WHITELISTED_WALLETS) {
  process.env.BETA_WHITELISTED_WALLETS.split(',').forEach((addr) => {
    const trimmed = addr.trim().toLowerCase();
    if (trimmed.startsWith('0x') && trimmed.length === 42) {
      walletWhitelist.add(trimmed);
    }
  });
}

export function isWalletWhitelisted(address: string): boolean {
  return walletWhitelist.has(address.toLowerCase());
}

export function addWalletToWhitelist(address: string): boolean {
  const normalized = address.toLowerCase();
  if (!normalized.startsWith('0x') || normalized.length !== 42) return false;
  walletWhitelist.add(normalized);
  return true;
}

export function removeWalletFromWhitelist(address: string): boolean {
  return walletWhitelist.delete(address.toLowerCase());
}

export function getWhitelistedWallets(): string[] {
  return Array.from(walletWhitelist);
}
