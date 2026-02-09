# MEGA CHAD — Handoff

**What is this?** The $MEGACHAD website. Users burn tokens to generate AI art.
**Live preview:** https://mega-chad.vercel.app
**Repo:** https://github.com/megachadxyz/mega-chad
**Launch:** Feb 9

---

## HOW IT WORKS (simple version)

```
1. User connects wallet
2. User types a prompt like "jacked chad on the moon"
3. User clicks BURN — this burns 1,000 $MEGACHAD tokens forever
4. AI generates an image based on the prompt
5. Image gets pinned to IPFS permanently
6. User gets their image + IPFS link
```

The more people burn, the fewer tokens exist. Deflationary creativity.

---

## WHAT'S DONE

- Full website with all sections (hero, about, burn-to-create, roadmap, notable chads, footer)
- Image carousel with music
- Wallet connect (MetaMask etc)
- Burn-to-create UI with progress states
- AI image generation backend (Replicate Flux Schnell)
- IPFS pinning (Pinata)
- Gallery page at `/gallery`
- Smart contract ready (ERC-20 with burn, 1B supply)
- Deployed to Vercel (preview)

## WHAT'S NOT DONE

- [ ] Deploy the token contract to MegaETH
- [ ] Put the real contract address in the site (currently shows `0xaaaaaa`)
- [ ] Update "BUY NOW" links to point to the actual DEX
- [ ] Add env vars on Vercel so the burn feature actually works
- [ ] Add a favicon

---

## HOW TO RUN LOCALLY

You need: Node.js 18+

```bash
git clone https://github.com/megachadxyz/mega-chad.git
cd mega-chad
npm install
cp env.example .env.local
# fill in the API keys (see below)
npm run dev
# open http://localhost:3000
```

---

## API KEYS YOU NEED

Copy `env.example` to `.env.local` and fill these in:

| Key | What it is | Where to get it |
|-----|-----------|-----------------|
| `REPLICATE_API_TOKEN` | Makes the AI images | https://replicate.com → sign up → API Tokens |
| `PINATA_JWT` | Saves images to IPFS | https://pinata.cloud → sign up → API Keys → New Key → copy JWT |
| `UPSTASH_REDIS_REST_URL` | Prevents double-spending burns | https://upstash.com → sign up → Create Database → copy REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Same as above | Same page, copy REST Token |
| `NEXT_PUBLIC_MEGACHAD_CONTRACT` | The token contract address | You get this after deploying the contract |
| `NEXT_PUBLIC_BURN_AMOUNT` | Tokens burned per image | Set to `1000` |

All of these have free tiers. You don't need to pay for anything.

---

## HOW TO DEPLOY THE TOKEN

The smart contract is in `contracts/`. You need Foundry installed.

```bash
# Install Foundry (if you don't have it)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Run tests
cd contracts
forge test

# Deploy to MegaETH TESTNET (stealth name for opsec)
forge script script/Deploy.s.sol:DeployTestnet \
  --rpc-url https://carrot.megaeth.com/rpc \
  --broadcast \
  --private-key YOUR_DEPLOYER_PRIVATE_KEY

# The console will print the deployed contract address
# Copy that address into .env.local as NEXT_PUBLIC_MEGACHAD_CONTRACT
# Also update the hero section CA display in app/page.tsx (search for 0xaaaaaa)
```

For MAINNET deploy, change the script or pass different constructor args:
- Testnet: "Test Token Alpha" / "TTA" (stealth)
- Mainnet: "Mega Chad" / "MEGACHAD" (real name)

---

## HOW TO MOVE HOSTING TO YOUR OWN VERCEL

Right now this is on a contributor's Vercel. Here's how to put it on the org's account:

### Step 1: Install the Vercel app on GitHub

Go here: https://github.com/apps/vercel/installations/new

- You need to be an **admin** of the megachadxyz GitHub org
- Click "megachadxyz"
- Select "Only select repositories" → pick "mega-chad"
- Click Install

### Step 2: Import the repo on Vercel

Go here: https://vercel.com/new/import?s=https://github.com/megachadxyz/mega-chad

- Log into Vercel (use "Continue with GitHub")
- It should auto-detect Next.js
- Click Deploy
- It will build and give you a URL like `mega-chad-xyz.vercel.app`

### Step 3: Add the API keys

In Vercel:
1. Go to your project → Settings → Environment Variables
2. Add each key from the table above
3. Click Save
4. Go to Deployments → click the 3 dots on the latest → Redeploy

### Step 4: Custom domain (optional)

1. Go to Settings → Domains
2. Type your domain (like `megachad.xyz`)
3. Vercel tells you what DNS records to add
4. Go to your domain registrar and add them
5. Wait a few minutes, done

### Step 5: Delete the preview

Once your own deployment works, the contributor can delete the preview at:
https://vercel.com/midaswhales-projects/mega-chad/settings → scroll down → Delete Project

### After that: auto-deploy

Every time someone pushes to `main` on GitHub, Vercel automatically rebuilds and deploys. PRs get their own preview URLs too.

---

## FILE MAP

If you need to change something, here's where to look:

| I want to... | Edit this file |
|--------------|---------------|
| Change the website text/layout | `app/page.tsx` |
| Change colors/fonts/styles | `app/globals.css` |
| Change the burn amount | `lib/contracts.ts` (and `.env.local`) |
| Change the AI image model | `app/api/generate/route.ts` |
| Change the token contract | `contracts/src/MegaChadToken.sol` |
| Add/replace images | `public/images/` |
| Change the music | `public/audio/megachad-theme.mp3` |
| Change wallet/chain config | `lib/wagmi.ts` |

---

## TECH STACK (for nerds)

- **Next.js 14** — React framework
- **wagmi v2 + viem v2** — wallet connection + blockchain calls
- **Replicate** — AI image generation (Flux Schnell model)
- **Pinata** — IPFS pinning
- **Upstash Redis** — transaction dedup + gallery data
- **MegaETH** — the blockchain (chain ID 4326 mainnet / 6342 testnet)
- **Foundry** — Solidity dev tools
- **Vercel** — hosting

---

## ARCHITECTURE (for bigger nerds)

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

The contract is a standard ERC-20 with OpenZeppelin's ERC20Burnable. 1 billion supply, 18 decimals. The `burn()` function sends tokens to the zero address permanently.

---

*Updated 2026-02-09*
