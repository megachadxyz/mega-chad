# MEGA CHAD — Handoff for Sandwich the Frog

**Hey Burger.** Yes, you. BurgerTheToad. Baguette the Amphibian. Croissant the Salamander. This doc is for you.

You have Claude Code passes now, which means you have an AI developer that will do literally everything for you. You just type what you want in English and it does it. Even you can't mess this up. Probably.

**Live preview:** https://mega-chad.vercel.app
**Repo:** https://github.com/megachadxyz/mega-chad
**Launch:** Feb 9

---

## HOW THE SITE WORKS (the simple version, for toads)

```
1. User connects wallet
2. User types a prompt like "jacked chad on the moon"
3. User clicks BURN — costs 1,000 $MEGACHAD tokens
4. The 1,000 tokens split: 500 burned forever + 500 sent to the dev wallet
5. AI generates an image based on the prompt
6. Image gets pinned to IPFS permanently
7. User gets their image + IPFS link
```

50% of every burn is destroyed (deflationary). 50% goes to the dev wallet (funds the team). This is called "tokenomics" Burger. Write it down.

---

## WHAT'S DONE

- Full website with all sections (hero, about, burn-to-create, roadmap, notable chads, footer)
- Image carousel with music (yes it works, you found it)
- Wallet connect (MetaMask, Brave Wallet, Phantom, etc.)
- Burn-to-create UI with progress states
- AI image generation backend (Replicate Flux Schnell)
- IPFS pinning (Pinata)
- Gallery page at `/gallery`
- Smart contract ready (ERC-20 with `burnToCreate`, 1B supply, 50/50 split)
- Deployed to Vercel (preview)
- Pink is `#F786C6` (you're welcome)
- Buy links go to kumbaya.xyz (you're welcome again)

## WHAT'S NOT DONE

- [ ] Deploy the token contract to MegaETH
- [ ] Put the real contract address in the site (currently shows `0xaaaaaa`)
- [ ] Update "BUY NOW" links to point to the actual DEX (if not kumbaya)
- [ ] Add env vars on Vercel so the burn feature actually works in production
- [ ] Add a favicon
- [ ] Teach Burger how computers work (ongoing, may take years)

---

## OK BURGER HERE'S HOW YOU USE CLAUDE CODE

Listen up Biscuit the Newt. You have Claude Code passes. This means you have a mass murdering AI software engineer living inside your terminal that will write code, fix bugs, deploy websites, and basically do everything except make you breakfast. You just talk to it in English. Like texting, but the other person is actually competent.

You don't need to know how to code. You don't need to know what JavaScript is. You don't even need to know what a terminal is (we'll get there). Just follow these steps and try not to lick your screen.

---

### STEP 1: Install the stuff your computer needs

You need two things installed first. Think of these as prerequisites. Pre-req-ui-sites. Big word for you, I know.

**Node.js** (this makes JavaScript run on your computer — don't ask what JavaScript is, just install it):

1. Go to https://nodejs.org
2. See that big green button that says **LTS**? Click it. Download it.
3. Run the installer. Click Next. Click Next. Click Next. Click Finish. You're a pro.
4. To make sure it worked: open a terminal (see below) and type `node --version`
5. If you see something like `v20.x.x` you're golden. If you see an error, you did something wrong. Try again Burger.

**Git** (this tracks code changes — it's how developers collaborate without killing each other):

1. Go to https://git-scm.com/downloads
2. Download for your OS (Windows, Mac, whatever toads use these days)
3. Run the installer. Click Next through everything. Don't change any settings, the defaults are fine.
4. Verify: open terminal, type `git --version`. You should see a version number.

**"What's a terminal?"** — Good question Baguette.
- On **Windows**: Press the Windows key, type "PowerShell", click it. That black/blue window is your terminal.
- On **Mac**: Press Cmd+Space, type "Terminal", press Enter.
- It's where you type commands. Like MS-DOS. You don't know what MS-DOS is either. Never mind. Just open it.

---

### STEP 2: Install Cursor (this is your new best friend)

Cursor is a code editor with AI built in. Think of it as Microsoft Word but for code, and it can answer your questions. Even the dumb ones.

1. Go to https://cursor.com
2. Download it. Install it. Open it.
3. It'll ask you to sign in — create an account or use GitHub login
4. You now have an IDE. That stands for Integrated Development Environment. You don't need to remember that. Just call it Cursor.

**Why Cursor and not just a regular terminal?** Because Cursor shows you all the files on the left side, lets you click on them to read them, AND has its own AI chat built in. So when Claude Code is making changes, you can literally watch the files change in real time. It's like spectating someone else do your homework. Your specialty.

---

### STEP 3: Get the code onto your computer

Open Cursor. Then open the terminal INSIDE Cursor:
- Press `` Ctrl+` `` (that's the backtick key, the one above Tab, the one you've never pressed in your life)
- Or go to View -> Terminal at the top menu

Now type these commands one at a time (press Enter after each):

```bash
git clone https://github.com/megachadxyz/mega-chad.git
```

This downloads the entire project to your computer. Then:

```bash
cd mega-chad
npm install
```

This installs all the dependencies (libraries the project needs).

Now open the folder in Cursor properly:
- File -> Open Folder
- Navigate to the `mega-chad` folder (probably in your home directory or wherever you ran the clone)
- Click Open
- You should see all the project files on the left sidebar. Look at you go, Ciabatta the Gecko.

---

### STEP 4: Install Claude Code (the AI that will do your job)

Still in Cursor's terminal (`` Ctrl+` `` if it's not open), type:

```bash
npm install -g @anthropic-ai/claude-code
```

Wait for it to finish. Then type:

```bash
claude
```

**First time setup:**
- It'll give you a link and say something like "Go to this URL to authenticate"
- Click the link (or copy-paste it into your browser)
- Log in with your Anthropic account (the one with the Claude Code pass)
- Come back to the terminal
- You should see Claude Code ready and waiting for your commands

If it says "command not found" you probably didn't install Node.js properly. Go back to Step 1. Yes, really. Take a deep breath Burger.

---

### STEP 5: Talk to it like a normal person

You're now in Claude Code. The terminal is waiting for you to type something. Just tell it what you want. In English. Like you're texting someone who actually knows what they're doing.

**Changing the website:**
- `change the pink color to blue`
- `make the headline say "BURN TO EARN" instead of "a chad does what a chad wants"`
- `add a new image to the carousel — the file is at public/images/newchad.jpg`
- `remove the Andrew Tate card from Notable Chads`
- `change the burn amount from 1000 to 500`
- `make the font bigger on the hero section`
- `add a new section below About that says "BURGER WAS HERE"`

**Running the site locally (to preview before deploying):**
- `run the dev server so I can preview the site`
- Then open http://localhost:3000 in your browser
- You'll see the site running on your own computer. Changes show up in real time.

**Deploying (making it live for everyone):**
- `push my changes to github`
- `deploy to vercel`

**When something breaks (and it will, because you're you):**
- `the page won't load, help`
- `the burn button isn't working, fix it`
- `I'm getting an error that says [paste the error here]`
- `everything is broken and I don't know what happened` (Claude will figure it out)

**Understanding what's going on:**
- `explain how the burn-to-create flow works`
- `what file controls the roadmap section?`
- `show me where the wallet connect logic is`
- `what does this file do?` (after clicking on any file in the sidebar)

**Smart contract stuff:**
- `deploy the token contract to MegaETH testnet with dev wallet 0x1234...`
- `update the contract address in the hero section to 0xABCD...`
- `run the contract tests`

---

### STEP 6: Your daily routine (even a toad can do this)

Here's what a normal session looks like. Memorize this Burger. Tattoo it on your arm if you have to.

1. **Open Cursor**
2. **Open the terminal** — press `` Ctrl+` ``
3. **Make sure you're in the right folder** — type `cd mega-chad` (if you're not already there)
4. **Start Claude Code** — type `claude`
5. **Tell it what you want** — just type in English
6. **Watch it work** — you'll see files changing in the Cursor sidebar in real time
7. **Preview** — tell Claude `run the dev server`, then open http://localhost:3000
8. **Deploy** — if it looks good, tell Claude `push to github and deploy to vercel`
9. **That's it.** You did a development. Your parents would be so proud, Panini the Frog.

---

### BONUS: Cursor's own AI (you have TWO AIs now, god help us)

Cursor has its own AI features that work alongside Claude Code:

- **Ctrl+K** — highlight some code and ask a question about it, or tell it to change something
- **Ctrl+L** — opens an AI chat sidebar where you can ask questions about whatever file you're looking at
- Click any file on the left to open it, then use Ctrl+L to ask "what does this file do?"

**When to use which:**
- **Cursor's AI** (Ctrl+K, Ctrl+L) — quick questions about a specific file you're staring at
- **Claude Code** (in the terminal) — making changes across the whole project, deploying, fixing bugs, anything big

Use both. You've got two AIs. You're basically a tech company now. MegaChad Enterprises, CEO: Flatbread the Tadpole.

---

### What Claude Code CAN'T do

- It can't connect your wallet or sign transactions (you gotta do that in your browser)
- It can't type your passwords (it'll tell you when it needs you to do something)
- First time deploying to Vercel or pushing to GitHub, you might need to log in once in the terminal — after that Claude handles it

---

### When you're stuck (this section is specifically for you Burger)

- Type `help` in Claude Code for a list of commands
- Type `explain what just happened` if something confusing happened
- Describe what went wrong in plain English — Claude is extremely good at debugging, way better than whatever you were doing before
- **Nuclear option**: close the terminal, open a new one, type `cd mega-chad`, then `claude` — fresh start, clean slate, just like your browser history

---

## API KEYS YOU NEED

Before the burn feature works in production, someone needs to set up these accounts and put the keys in Vercel. Copy `env.example` to `.env.local` for local development.

| Key | What it does | Where to get it |
|-----|-------------|-----------------|
| `REPLICATE_API_TOKEN` | Makes the AI images | https://replicate.com -> sign up -> API Tokens |
| `PINATA_JWT` | Saves images to IPFS forever | https://pinata.cloud -> sign up -> API Keys -> New Key -> copy JWT |
| `UPSTASH_REDIS_REST_URL` | Prevents double-spending burns | https://upstash.com -> sign up -> Create Database -> copy REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Same as above | Same page, copy REST Token |
| `NEXT_PUBLIC_MEGACHAD_CONTRACT` | The token contract address | You get this after deploying the contract |
| `NEXT_PUBLIC_BURN_AMOUNT` | How many tokens per burn | Set to `1000` |
| `DEV_WALLET` | Wallet that gets 50% of burns | Your team wallet address |

All free tiers. Costs $0. Even your budget can handle it.

---

## HOW TO DEPLOY THE TOKEN CONTRACT

The smart contract is in `contracts/`. It's written in Solidity. You don't need to understand it — Claude Code can deploy it for you. Just tell it:

```
deploy the token contract to MegaETH testnet with dev wallet 0xYOUR_WALLET_HERE
```

Or if you want to be hands-on (respect), here's the manual way:

```bash
# Install Foundry (Solidity dev tools)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Run tests (14 tests, should all pass)
cd contracts
forge test

# Deploy to MegaETH TESTNET
DEV_WALLET=0xYOUR_DEV_WALLET \
forge script script/Deploy.s.sol:DeployTestnet \
  --rpc-url https://carrot.megaeth.com/rpc \
  --broadcast \
  --private-key YOUR_DEPLOYER_PRIVATE_KEY
```

The contract does this:
- `burnToCreate(1000 tokens)` — burns 500 forever + sends 500 to dev wallet
- Dev wallet is set at deploy time and **can never be changed** (immutable)
- Testnet uses stealth names ("Test Token Alpha" / "TTA") for opsec
- Mainnet uses real names ("Mega Chad" / "MEGACHAD")

**IMPORTANT:** Triple-check the `DEV_WALLET` address before mainnet deploy. It's permanent. Like that tattoo you probably have.

---

## HOW TO MOVE HOSTING TO YOUR OWN VERCEL

Right now the site is on a contributor's Vercel account. Here's how to put it on the org's account.

### Step 1: Install the Vercel GitHub app

Go to: https://github.com/apps/vercel/installations/new

- You need to be an **admin** of the megachadxyz GitHub org
- Click "megachadxyz"
- Select "Only select repositories" -> pick "mega-chad"
- Click Install

### Step 2: Import on Vercel

Go to: https://vercel.com/new/import?s=https://github.com/megachadxyz/mega-chad

- Log into Vercel with GitHub
- It auto-detects Next.js
- Click Deploy
- Get a URL like `mega-chad-xyz.vercel.app`

### Step 3: Add the API keys on Vercel

1. Project -> Settings -> Environment Variables
2. Add each key from the table above
3. Save
4. Go to Deployments -> click 3 dots on latest -> Redeploy

### Step 4: Point megachad.xyz at it

1. Settings -> Domains -> type `megachad.xyz`
2. Vercel gives you DNS records
3. Go to your domain registrar, add them
4. Wait a few minutes. Done.

### Step 5: Delete the old preview

Once yours works: https://vercel.com/midaswhales-projects/mega-chad/settings -> Delete Project

After this, every push to `main` on GitHub auto-deploys. PRs get preview URLs. It's the future Burger. Welcome.

---

## FILE MAP (where to find stuff)

Tell Claude Code what you want to change and it'll find the right file. But if you want to look yourself:

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

Or just tell Claude: `what file controls [thing]?` and it'll tell you. You don't have to memorize anything. I know that's a relief for you Burger.

---

## BURN MECHANICS (how the 50/50 split works)

```
User sends 1,000 $MEGACHAD
  |
  +---> 500 tokens -> 0x0000...0000 (burned forever, reduces total supply)
  |
  +---> 500 tokens -> dev wallet (funds the team)
```

- Dev wallet is immutable (set at deploy, never changes)
- The regular `burn()` function also exists (100% to zero address)
- The website uses `burnToCreate()` for the AI art feature

---

## TECH STACK (you won't understand this but it's here for completeness)

- **Next.js 14** — React framework (the website)
- **wagmi v2 + viem v2** — wallet connection + blockchain calls
- **Replicate** — AI image generation (Flux Schnell model)
- **Pinata** — IPFS pinning (permanent image storage)
- **Upstash Redis** — transaction dedup + gallery data
- **MegaETH** — the blockchain (chain ID 4326 mainnet / 6342 testnet)
- **Foundry** — Solidity dev tools (smart contract testing)
- **Vercel** — hosting

---

## ARCHITECTURE (for actual nerds, not you Burger)

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

Standard ERC-20 with OpenZeppelin's ERC20Burnable + custom `burnToCreate()`. 1 billion supply, 18 decimals. Dev wallet is immutable.

---

*Updated 2026-02-09 by someone who believes in you Burger. Barely.*
