# Mega Chad: Burn-to-Create on MegaETH

## Status (as of 2026-02-09)

| Step | Description | Status |
|------|-------------|--------|
| 1 | Smart Contract (MegaChadToken.sol) | DONE |
| 2 | Install Dependencies | DONE |
| 3 | Create lib/ utilities (wagmi, contracts, pinata, redis) | DONE |
| 4 | Create app/providers.tsx | DONE |
| 5 | Update app/layout.tsx | DONE |
| 6 | Rebuild app/page.tsx (full site) | DONE |
| 7 | Update app/api/generate/route.ts (burn verify + IPFS) | DONE |
| 8 | Create app/api/gallery/route.ts | DONE |
| 9 | Create app/gallery/page.tsx | DONE |
| 10 | Delete Webflow code + update config | DONE |
| 11 | Asset migration (images, audio from Webflow) | DONE |
| — | Vercel deploy (preview) | DONE — https://mega-chad.vercel.app |

### Remaining TODO
- **Deploy token** to MegaETH testnet → update `NEXT_PUBLIC_MEGACHAD_CONTRACT`
- **Replace placeholder CA** (`0xaaaaaa`) in hero with real contract address
- **Update Buy links** to actual DEX URL
- **Add env vars on Vercel** (Replicate, Pinata, Upstash) so burn feature works end-to-end
- **Add favicon** (`public/favicon.ico`)
- **Transfer Vercel project** to megachadxyz org (see HANDOFF.md)

---

## Context

The Mega Chad project is pivoting from NFT minting to a **burn-to-create** model. Users burn $MEGACHAD tokens on MegaETH to generate AI art via Replicate, which gets pinned permanently to IPFS. The Webflow marketing site is being replaced — the Next.js app becomes the full site, inheriting the dark/neon-pink design and all sections (hero, about, roadmap, notable chads, footer).

## What Exists

- **Repo**: `cloned-repos/mega-chad/`
- **Working**: Replicate Flux Schnell image generation (`app/api/generate/route.ts`)
- **Working**: Dark theme UI with prompt input (`app/page.tsx`)
- **Broken/Remove**: Webflow API integration (token has no scopes)
- **Reusable**: Pinata SDK pattern from `irie-milady/upload_pinata_node.js` (JWT valid until 2027)
- **Reusable**: Foundry setup pattern from `cloned-repos/8004-contracts/` (OZ contracts, deploy scripts)
- **Design reference**: Webflow site captured (dark bg, neon pink accents, $MEGACHAD header, roadmap, chad cards)

## Architecture

```
User connects wallet (wagmi/viem)
       ↓
User enters prompt + clicks "Burn & Create"
       ↓
Frontend calls burn(1000 * 10^18) on $MEGACHAD token
       ↓
User signs tx in wallet → tx confirmed on MegaETH
       ↓
Frontend sends { txHash, prompt, burnerAddress } to POST /api/generate
       ↓
Backend verifies burn on MegaETH RPC:
  - tx succeeded
  - Transfer event to 0x0 from correct contract
  - amount >= 1000 MEGACHAD
  - txHash not already used
       ↓
Backend generates image via Replicate (Flux Schnell)
       ↓
Backend pins image to Pinata IPFS with metadata
       ↓
Backend stores record in Redis (txHash → {burner, prompt, cid, timestamp})
       ↓
Returns { ipfsCid, ipfsUrl, imageUrl } to frontend
```

## Implementation Steps

### Step 1: Smart Contract — `contracts/src/MegaChadToken.sol`

Simple ERC-20 with burn capability. OpenZeppelin ERC20 + ERC20Burnable.

**OPSEC: Testnet deployment uses vague/stealth names to not blow plans.**
- Testnet name: "Test Token Alpha" / "TTA" (or similar generic name)
- Mainnet name: "Mega Chad" / "MEGACHAD" (only at launch)
- Constructor takes name/symbol as params so we can switch at deploy time

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MegaChadToken is ERC20, ERC20Burnable {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1_000_000_000 * 10**18); // 1B supply
    }
}
```

- Create `contracts/` directory with Foundry project (foundry.toml, src/, script/, test/)
- Deploy script targeting MegaETH testnet (chain 6342, RPC `https://carrot.megaeth.com/rpc`)
- **Testnet deploy**: `Deploy.s.sol` passes "Test Token Alpha" / "TTA"
- **Mainnet deploy**: separate script or env-based switch for real name
- Pattern from: `cloned-repos/8004-contracts/foundry.toml` + `script/DeployMonad.s.sol`
- **Token supply**: 1 billion (standard for meme tokens)
- **Burn per image**: 1,000 tokens (configurable via env `NEXT_PUBLIC_BURN_AMOUNT`)

### Step 2: Install Dependencies

```bash
cd cloned-repos/mega-chad
npm install wagmi viem @tanstack/react-query pinata @upstash/redis
```

- `wagmi` v2 + `viem` v2 — wallet connect + chain interaction
- `@tanstack/react-query` — wagmi peer dep
- `pinata` v2.5.3 — IPFS pinning (same as `irie-milady/package.json`)
- `@upstash/redis` — tx hash dedup on Vercel (free tier: 10K cmds/day)

### Step 3: Create `lib/` Utilities

**`lib/wagmi.ts`** — Wagmi config + custom MegaETH chain definition:
```ts
import { defineChain } from 'viem'
export const megaethTestnet = defineChain({
  id: 6342,
  name: 'MegaETH Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
})
export const megaeth = defineChain({
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.megaeth.com'] } }, // TBD mainnet RPC
})
```

**`lib/contracts.ts`** — ABI + address constants for $MEGACHAD token (ERC20 burn ABI)

**`lib/pinata.ts`** — Pinata upload helper (adapted from `irie-milady/upload_pinata_node.js`):
- Uses `PinataSDK` with JWT from env `PINATA_JWT`
- Single file upload with metadata (burner, prompt, txHash)

**`lib/redis.ts`** — Upstash Redis client:
- `markTxUsed(txHash)` — SET with metadata
- `isTxUsed(txHash)` — EXISTS check
- `getRecentBurns(limit)` — for gallery

### Step 4: Create `app/providers.tsx`

WagmiProvider + QueryClientProvider wrapping the app. Configures wagmi with MegaETH chain and injected connector (MetaMask etc).

### Step 5: Update `app/layout.tsx`

- Wrap children with `<Providers>`
- Update metadata: title "Mega Chad — Burn to Create", description
- Import fonts if needed for the design (the Webflow site uses a blocky/pixel-style font)

### Step 6: Rebuild `app/page.tsx` — Full Site

Replace the current minimal page with the full site design from Webflow:

**Sections (from Webflow capture):**
1. **Header/Nav** — $MEGACHAD logo, About/Roadmap/Chads links, Connect Wallet button (wagmi)
2. **Hero** — Images (mugshot, tren bottle), tagline "a chad does what a chad wants", CA display, Buy Now link
3. **Carousel** — Image slider with meme content
4. **About** — "$MEGACHAD is the home of looksmaxxing on MegaETH"
5. **🔥 Burn-to-Create Section (NEW)** — The main feature:
   - Prompt input ("Describe your Mega Chad...")
   - Token balance display
   - "Burn 1,000 $MEGACHAD & Generate" button
   - Progress states: connecting → approving → burning → generating → pinning → done
   - Result: image + IPFS link + share button
6. **Roadmap** — Bulk (Feb 9), Cut (TBA), Recomp (TBA), Looksmaxx (TBA)
7. **Notable Chads** — Character cards (Clavicular, Sam Sulek, Andrew Tate)
8. **Footer** — Logo, nav links, social links (X/Twitter), "Launch Feb 9 - MegaETH"

**Design tokens (from Webflow):**
- Background: `#0a0a0f` (very dark)
- Accent: neon pink/magenta with glow effect
- Text: light gray/white
- Buttons: pink with glow border
- Font: blocky/pixel aesthetic for headings

### Step 7: Update `app/api/generate/route.ts` — Burn Verification + IPFS

The API route becomes the critical backend. New flow:

```
POST /api/generate
Body: { txHash, prompt, burnerAddress }

1. Validate inputs
2. Check Redis: is txHash already used? → 409 Conflict
3. Verify burn on MegaETH RPC:
   a. eth_getTransactionReceipt(txHash)
   b. Parse logs for Transfer(from, 0x0, amount) from our contract
   c. Verify amount >= BURN_AMOUNT
   d. Verify from == burnerAddress
4. Mark txHash as used in Redis
5. Generate image via Replicate (existing code)
6. Download image buffer
7. Pin to Pinata IPFS with metadata { burner, prompt, txHash, timestamp }
8. Store burn record in Redis: { txHash, burner, prompt, cid, timestamp }
9. Return { ipfsCid, ipfsUrl, imageUrl }
```

### Step 8: Create `app/api/gallery/route.ts`

```
GET /api/gallery?limit=20&offset=0
Returns recent burns: [{ txHash, burner, prompt, ipfsCid, ipfsUrl, timestamp }]
```

Reads from Redis sorted set of recent burns.

### Step 9: Create `app/gallery/page.tsx`

Gallery page showing past burns — grid of images with burner address, prompt, and IPFS link. Social proof for the project.

### Step 10: Delete Webflow Code + Update Config

- Delete `app/api/webflow/` directory
- Delete `docs/WEBFLOW_SETUP.md`
- Update `env.example`:
  ```
  # Replicate (image gen)
  REPLICATE_API_TOKEN=

  # Pinata (IPFS pinning)
  PINATA_JWT=

  # Upstash Redis (tx dedup + gallery)
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=

  # MegaETH
  NEXT_PUBLIC_MEGAETH_CHAIN_ID=6342
  NEXT_PUBLIC_MEGACHAD_CONTRACT=0x...
  NEXT_PUBLIC_BURN_AMOUNT=1000

  # Optional: mainnet override
  # NEXT_PUBLIC_MEGAETH_CHAIN_ID=4326
  ```
- Update `next.config.js`: add Pinata gateway to image remote patterns
- Update `docs/HANDOFF.md` with new architecture

### Step 11: Asset Migration

User is scraping the Webflow site for assets. Once available, copy into `public/images/`:
- $MEGACHAD header logo
- Hero images (mugshot, tren bottle)
- Carousel images
- Notable Chads photos
- Any icons/decorative elements

**Design approach**: Hybrid — match the Webflow design intent (dark bg, neon pink glow, blocky headings, section layout) but not pixel-perfect. Clean up and focus on burn-to-create as the hero feature. Same sections, same vibe, better execution.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `contracts/` | CREATE | Foundry project with MegaChadToken.sol |
| `contracts/src/MegaChadToken.sol` | CREATE | ERC20 + ERC20Burnable, 1B supply |
| `contracts/script/Deploy.s.sol` | CREATE | Foundry deploy script |
| `contracts/foundry.toml` | CREATE | Foundry config |
| `lib/wagmi.ts` | CREATE | Wagmi config + MegaETH chain |
| `lib/contracts.ts` | CREATE | ABI + address constants |
| `lib/pinata.ts` | CREATE | IPFS pinning helper |
| `lib/redis.ts` | CREATE | Upstash Redis client |
| `app/providers.tsx` | CREATE | WagmiProvider wrapper |
| `app/page.tsx` | REWRITE | Full site with burn-to-create |
| `app/layout.tsx` | MODIFY | Add providers, update metadata |
| `app/globals.css` | MODIFY | Full site styles (Webflow design) |
| `app/gallery/page.tsx` | CREATE | Gallery of past burns |
| `app/api/generate/route.ts` | REWRITE | Burn verify + Replicate + Pinata |
| `app/api/gallery/route.ts` | CREATE | Gallery data endpoint |
| `app/api/webflow/` | DELETE | Not needed |
| `docs/WEBFLOW_SETUP.md` | DELETE | Not needed |
| `package.json` | MODIFY | Add wagmi, viem, pinata, upstash |
| `env.example` | REWRITE | New env vars |
| `.env.local` | MODIFY | Add new tokens |
| `next.config.js` | MODIFY | Add Pinata image patterns |
| `public/images/` | CREATE | Assets from Webflow site |

## Verification

1. **Contract**: `forge test` in `contracts/`, then deploy to MegaETH testnet
2. **Frontend**: `npm run dev` → open localhost:3000 → verify all sections render
3. **Wallet Connect**: Click "Connect Wallet" → MetaMask connects to MegaETH testnet
4. **Burn Flow**: Get testnet MEGACHAD tokens → enter prompt → burn → verify image generates
5. **IPFS**: Confirm image appears on `gateway.pinata.cloud/ipfs/{CID}`
6. **Gallery**: Navigate to `/gallery` → see recent burns
7. **Replay Protection**: Try resubmitting same txHash → should get 409
8. **Browser test**: Screenshot each section with Playwright to verify design matches Webflow
