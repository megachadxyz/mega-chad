# Handoff

**Project:** Mega Chad — Burn-to-Create on MegaETH
**Repo:** [github.com/megachadxyz/mega-chad](https://github.com/megachadxyz/mega-chad)
**Site:** Dark neon-pink theme, all sections in Next.js. Launch target Feb 9.

---

## Architecture

```
User connects wallet (wagmi/viem on MegaETH)
  -> User enters prompt + clicks "Burn & Create"
  -> Frontend calls burn(1000 * 10^18) on $MEGACHAD ERC-20
  -> User signs tx in wallet -> tx confirmed
  -> Frontend sends { txHash, prompt, burnerAddress } to POST /api/generate
  -> Backend verifies burn on MegaETH RPC
  -> Backend generates image via Replicate (Flux Schnell)
  -> Backend pins image to Pinata IPFS
  -> Backend stores record in Upstash Redis
  -> Returns { ipfsCid, ipfsUrl, imageUrl }
```

---

## Stack

- **Next.js 14** (App Router), deploy on **Vercel**
- **wagmi v2 + viem v2** — wallet connect + on-chain interaction
- **Replicate** — AI image generation (Flux Schnell)
- **Pinata** — IPFS pinning (free tier: 500MB / 100 pins)
- **Upstash Redis** — tx hash dedup + gallery (free tier: 10K cmds/day)
- **MegaETH** — chain ID 4326 mainnet / 6342 testnet
- **Foundry** — Solidity dev (contracts/ directory)

---

## What's in this repo

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Full landing page: nav, hero, carousel, about, burn-to-create, roadmap, notable chads, footer |
| `app/api/generate/route.ts` | POST — verify burn on-chain, generate image via Replicate, pin to IPFS, store in Redis |
| `app/providers.tsx` | WagmiProvider + QueryClientProvider |
| `app/layout.tsx` | Root layout with providers |
| `app/globals.css` | Full design system: dark theme, neon pink, Roboto Mono + Bebas Neue |
| `lib/wagmi.ts` | Wagmi config + MegaETH chain definitions |
| `lib/contracts.ts` | ABI + address constants for $MEGACHAD token |
| `lib/pinata.ts` | Pinata IPFS upload helper |
| `lib/redis.ts` | Upstash Redis client (tx dedup + gallery) |
| `contracts/` | Foundry project: MegaChadToken.sol (ERC20 + ERC20Burnable) |
| `public/images/` | All site assets (logo, hero images, chad photos, social icons) |
| `public/audio/` | Background music (megachad-theme.mp3) |
| `env.example` | Template for .env.local |
| `docs/HANDOFF.md` | This file |

---

## Smart Contract

`contracts/src/MegaChadToken.sol` — ERC-20 with OpenZeppelin ERC20Burnable.

- Constructor takes `name_` and `symbol_` params
- **Testnet**: deployed as "Test Token Alpha" / "TTA" (opsec)
- **Mainnet**: deploy as "Mega Chad" / "MEGACHAD"
- 1 billion total supply, 18 decimals
- Burn 1,000 tokens per image generation

```bash
cd contracts
forge test        # 7 tests passing
forge script script/Deploy.s.sol:DeployTestnet --rpc-url megaeth_testnet --broadcast
```

---

## Env (`.env.local`)

```
REPLICATE_API_TOKEN=       # https://replicate.com/account/api-tokens
PINATA_JWT=                # https://pinata.cloud
UPSTASH_REDIS_REST_URL=    # https://upstash.com
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_MEGACHAD_CONTRACT=0x...  # deployed token address
NEXT_PUBLIC_BURN_AMOUNT=1000
```

---

## Run

```bash
npm install
cp env.example .env.local  # fill in tokens
npm run dev                 # http://localhost:3000
```

---

## Not done / next

1. **Deploy token** to MegaETH testnet, then update `NEXT_PUBLIC_MEGACHAD_CONTRACT`
2. **Gallery page** (`/gallery`) — show recent burns from Redis
3. **Real CA** — replace placeholder `0xaaaaaa` in hero section
4. **Buy links** — update "BUY NOW" / "Buy $MEGACHAD" hrefs to actual DEX
5. **Vercel deploy** — add env vars in project settings

---

*Updated 2026-02-08*
