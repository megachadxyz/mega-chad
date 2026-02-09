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
3. User clicks BURN — costs 1,000 $MEGACHAD tokens
4. The 1,000 tokens split: 500 burned forever + 500 sent to the dev wallet
5. AI generates an image based on the prompt
6. Image gets pinned to IPFS permanently
7. User gets their image + IPFS link
```

50% of every burn is destroyed (deflationary). 50% goes to the dev wallet (funds the team).

---

## WHAT'S DONE

- Full website with all sections (hero, about, burn-to-create, roadmap, notable chads, footer)
- Image carousel with music
- Wallet connect (MetaMask etc)
- Burn-to-create UI with progress states
- AI image generation backend (Replicate Flux Schnell)
- IPFS pinning (Pinata)
- Gallery page at `/gallery`
- Smart contract ready (ERC-20 with `burnToCreate`, 1B supply, 50/50 split)
- Deployed to Vercel (preview)

## WHAT'S NOT DONE

- [ ] Deploy the token contract to MegaETH
- [ ] Put the real contract address in the site (currently shows `0xaaaaaa`)
- [ ] Update "BUY NOW" links to point to the actual DEX
- [ ] Add env vars on Vercel so the burn feature actually works
- [ ] Add a favicon

---

## USING CLAUDE CODE (AI CODING ASSISTANT)

You have Claude Code passes. This is basically an AI developer that can read and edit every file in the project, run commands, deploy to Vercel, and fix bugs — all from plain English instructions. You don't need to know how to code.

The easiest setup is **Cursor** (a code editor with AI built in) + **Claude Code** running inside it. That way you can see the files, ask the editor questions, AND have Claude Code make changes all in one place.

---

### STEP 1: Install the prerequisites

You need these installed on your computer first. If you already have them, skip ahead.

**Node.js** (makes JavaScript run on your computer):
1. Go to https://nodejs.org
2. Download the **LTS** version (the big green button)
3. Run the installer, click Next through everything
4. When it's done, open a terminal and type `node --version` — you should see a number like `v20.x.x`

**Git** (tracks code changes):
1. Go to https://git-scm.com/downloads
2. Download for your OS
3. Run the installer, click Next through everything (defaults are fine)
4. Verify: open terminal, type `git --version`

---

### STEP 2: Install Cursor (recommended IDE)

Cursor is a code editor that has AI built in. It makes everything way easier because you can see your files and ask questions right in the editor.

1. Go to https://cursor.com
2. Download and install it
3. Open it up
4. It'll ask you to sign in — create an account or use GitHub

---

### STEP 3: Clone the repo and open it in Cursor

Open a terminal (on Mac: Terminal app, on Windows: PowerShell or Command Prompt):

```bash
git clone https://github.com/megachadxyz/mega-chad.git
cd mega-chad
npm install
```

Then open the folder in Cursor:
- Open Cursor
- File -> Open Folder -> navigate to `mega-chad` -> click Open
- You should see all the project files on the left sidebar

---

### STEP 4: Install Claude Code

In Cursor, open the built-in terminal:
- Press `` Ctrl+` `` (backtick, the key above Tab) to toggle the terminal panel
- Or go to View -> Terminal

Then type:

```bash
npm install -g @anthropic-ai/claude-code
```

It'll download and install. When it's done, type:

```bash
claude
```

The first time you run it, it'll ask you to log in to your Anthropic account (the Claude Code pass). Follow the link it gives you, sign in, and come back.

---

### STEP 5: Start using it

Now you're in Claude Code. Just type what you want in plain English. Here are real examples:

**Making changes to the site:**
- `change the pink color to blue`
- `make the headline say "BURN TO EARN" instead of "a chad does what a chad wants"`
- `add a new image to the carousel — it's at public/images/newimage.jpg`
- `remove the Andrew Tate card from Notable Chads`
- `change the burn amount from 1000 to 500`

**Running and deploying:**
- `run the dev server so I can preview the site`
- `push my changes to github`
- `deploy to vercel`

**Fixing stuff:**
- `the page won't load, help`
- `the burn button isn't working, fix it`
- `I'm getting an error that says [paste the error here]`

**Understanding the code:**
- `explain how the burn-to-create flow works`
- `what file controls the roadmap section?`
- `show me where the wallet connect logic is`

**Contract stuff:**
- `deploy the token contract to MegaETH testnet with dev wallet 0x1234...`
- `update the CA in the hero section to 0xABCD...`
- `run the contract tests`

---

### STEP 6: Your typical workflow

Here's what a normal session looks like:

1. Open Cursor
2. Open the terminal (`` Ctrl+` ``)
3. Make sure you're in the mega-chad folder: `cd mega-chad`
4. Start Claude Code: `claude`
5. Tell it what you want to change
6. It makes the changes — you can see the files updating in real time in Cursor
7. Preview locally: tell Claude `run the dev server` then open http://localhost:3000
8. If it looks good: tell Claude `push to github and deploy to vercel`
9. Your changes are live

---

### Using Cursor's built-in AI too

Cursor itself has AI features you can use alongside Claude Code:

- **Cmd+K** (Mac) or **Ctrl+K** (Windows) — highlight some code and ask a question about it or ask it to change it
- **Cmd+L** (Mac) or **Ctrl+L** (Windows) — open the AI chat sidebar to ask questions about the code you're looking at
- Click on any file in the sidebar to read it — then ask Cursor's AI "what does this file do?"

The difference: **Cursor's AI** is good for quick questions about specific code you're looking at. **Claude Code** (in the terminal) is good for making changes across multiple files, running commands, deploying, etc. Use both.

---

### What Claude Code CAN'T do

- It can't connect your wallet or sign blockchain transactions
- It can't type passwords for you (it'll ask you to do it)
- If Vercel or GitHub need you to log in, you need to do that once in the terminal first — then Claude Code can deploy for you going forward

---

### If you get stuck

- Type `help` in Claude Code for a list of commands
- Type `explain what just happened` if something confusing happened
- Just describe what went wrong in plain English — it's very good at debugging
- Worst case: close the terminal, open a new one, `cd mega-chad`, `claude` — fresh start

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
| `REPLICATE_API_TOKEN` | Makes the AI images | https://replicate.com -> sign up -> API Tokens |
| `PINATA_JWT` | Saves images to IPFS | https://pinata.cloud -> sign up -> API Keys -> New Key -> copy JWT |
| `UPSTASH_REDIS_REST_URL` | Prevents double-spending burns | https://upstash.com -> sign up -> Create Database -> copy REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Same as above | Same page, copy REST Token |
| `NEXT_PUBLIC_MEGACHAD_CONTRACT` | The token contract address | You get this after deploying the contract |
| `NEXT_PUBLIC_BURN_AMOUNT` | Tokens burned per image | Set to `1000` |
| `DEV_WALLET` | Wallet that gets 50% of burns | Your team wallet address (used in deploy script) |

All of these have free tiers. You don't need to pay for anything.

---

## HOW TO DEPLOY THE TOKEN

The smart contract is in `contracts/`. You need Foundry installed.

The contract has a `burnToCreate()` function:
- Takes 1,000 tokens from the user
- Burns 500 (sends to zero address — gone forever)
- Sends 500 to the dev wallet (set at deploy time, immutable)

```bash
# Install Foundry (if you don't have it)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Run tests (14 tests, should all pass)
cd contracts
forge test

# Deploy to MegaETH TESTNET (stealth name for opsec)
DEV_WALLET=0xYOUR_DEV_WALLET_ADDRESS \
forge script script/Deploy.s.sol:DeployTestnet \
  --rpc-url https://carrot.megaeth.com/rpc \
  --broadcast \
  --private-key YOUR_DEPLOYER_PRIVATE_KEY

# The console will print the deployed contract address
# Copy that address into .env.local as NEXT_PUBLIC_MEGACHAD_CONTRACT
# Also update the hero section CA display in app/page.tsx (search for 0xaaaaaa)
```

For MAINNET deploy, change `DeployTestnet` to `DeployMainnet`:
- Testnet: "Test Token Alpha" / "TTA" (stealth)
- Mainnet: "Mega Chad" / "MEGACHAD" (real name)

**IMPORTANT:** The `DEV_WALLET` address is baked into the contract forever (immutable). Make sure it's the right wallet before deploying to mainnet.

---

## HOW TO MOVE HOSTING TO YOUR OWN VERCEL

Right now this is on a contributor's Vercel. Here's how to put it on the org's account:

### Step 1: Install the Vercel app on GitHub

Go here: https://github.com/apps/vercel/installations/new

- You need to be an **admin** of the megachadxyz GitHub org
- Click "megachadxyz"
- Select "Only select repositories" -> pick "mega-chad"
- Click Install

### Step 2: Import the repo on Vercel

Go here: https://vercel.com/new/import?s=https://github.com/megachadxyz/mega-chad

- Log into Vercel (use "Continue with GitHub")
- It should auto-detect Next.js
- Click Deploy
- It will build and give you a URL like `mega-chad-xyz.vercel.app`

### Step 3: Add the API keys

In Vercel:
1. Go to your project -> Settings -> Environment Variables
2. Add each key from the table above
3. Click Save
4. Go to Deployments -> click the 3 dots on the latest -> Redeploy

### Step 4: Custom domain (optional)

1. Go to Settings -> Domains
2. Type your domain (like `megachad.xyz`)
3. Vercel tells you what DNS records to add
4. Go to your domain registrar and add them
5. Wait a few minutes, done

### Step 5: Delete the preview

Once your own deployment works, the contributor can delete the preview at:
https://vercel.com/midaswhales-projects/mega-chad/settings -> scroll down -> Delete Project

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

## BURN MECHANICS

The smart contract (`burnToCreate` function) does this in ONE transaction:

```
User sends 1,000 $MEGACHAD
  |
  +---> 500 tokens -> 0x0000...0000 (burned forever, reduces total supply)
  |
  +---> 500 tokens -> dev wallet (funds the team)
```

- The dev wallet is set when the contract is deployed and can never be changed
- The regular `burn()` function still works too (sends 100% to zero address)
- The website uses `burnToCreate()` for the burn-to-create feature

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
  -> Frontend calls burnToCreate(1000 * 10^18) on $MEGACHAD ERC-20
  -> Contract burns 500 tokens + sends 500 to dev wallet
  -> User signs tx in wallet -> tx confirmed
  -> Frontend sends { txHash, prompt, burnerAddress } to POST /api/generate
  -> Backend verifies burn on MegaETH RPC (checks Transfer to 0x0)
  -> Backend generates image via Replicate (Flux Schnell)
  -> Backend pins image to Pinata IPFS
  -> Backend stores record in Upstash Redis
  -> Returns { ipfsCid, ipfsUrl, imageUrl }
```

The contract is a standard ERC-20 with OpenZeppelin's ERC20Burnable plus a custom `burnToCreate()`. 1 billion supply, 18 decimals. Dev wallet is immutable (set in constructor).

---

*Updated 2026-02-09*
