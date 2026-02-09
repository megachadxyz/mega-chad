# MEGA CHAD — Handoff for Sandwich the Frog

**Hey Burger.** Yes, you. BurgerTheToad. Baguette the Amphibian. This doc is for you.

You don't need to understand any of this. You have AI that does everything. You just type what you want in English. Like ordering food, except the waiter is a genius and you're... you.

**Live preview:** https://mega-chad.vercel.app
**Repo:** https://github.com/megachadxyz/mega-chad

---

## SETUP (one time, 10 minutes)

### Step 1: Install Cursor

Go to https://cursor.com. Download it. Install it. Open it. Sign in.

That's it Burger. That's the hard part. You did it. Gold star.

### Step 2: Use Cursor to set up Claude Code

Press **Ctrl+L** (or **Cmd+L** on Mac). A chat panel opens on the right side. Paste this:

```
I need to set up Claude Code in this editor. Here's what I need:

1. Make sure Node.js and Git are installed on my computer. If they're not, walk me through installing them.
2. Once those are ready, run this in the terminal: npm install -g @anthropic-ai/claude-code
3. Then clone this repo: git clone https://github.com/megachadxyz/mega-chad.git
4. cd into it and run: npm install
5. Open the mega-chad folder in this editor

Walk me through each step. I am not technical.
```

Follow what Cursor tells you. Click what it tells you to click. You're doing great, Croissant the Salamander.

### Step 3: Start Claude Code

Open the terminal in Cursor: press `` Ctrl+` `` (the key above Tab).

Type:

```
claude
```

First time it'll ask you to log in — it gives you a link, you click it, sign in with your Anthropic account (the one with the Claude Code pass), come back. Done.

**Claude Code is now running.** This is your AI developer. Everything from here on out, you just type what you want into this terminal and Claude Code does it.

---

## COPY-PASTE PROMPTS FOR CLAUDE CODE

Everything below goes into Claude Code (the terminal where you typed `claude`). Just copy-paste whichever one you need, Biscuit the Newt.

---

### Change how the site looks

```
Change the background color to dark purple
```

```
Make the main headline say "BURN TO CREATE" instead of whatever it says now
```

```
Make the font bigger on the hero section
```

```
Change the pink color to something more red
```

```
Add a new image to the carousel. The file is on my desktop called newchad.jpg — move it into the project and add it
```

```
Remove the Andrew Tate card from Notable Chads
```

```
Change the burn amount from 1000 to 500 everywhere on the site and in the code
```

```
Swap the music. I put a new mp3 on my desktop called newtrack.mp3 — replace the current one with it
```

---

### Preview the site on your computer

```
Run the dev server so I can preview the site locally
```

Then open http://localhost:3000 in your browser. That's your local preview.

---

### Make changes live for everyone

```
Push all my changes to GitHub and deploy to Vercel
```

---

### Fix stuff when it breaks

```
The site won't load. Fix it.
```

```
The burn button isn't working. Debug it and fix it.
```

```
Everything is broken and I don't know what happened. Investigate and fix it.
```

If you see an error message, just paste it in:

```
I'm getting this error: [PASTE THE ERROR HERE]
```

---

### Deploy the token contract

```
Deploy the token contract to MegaETH testnet with dev wallet 0xPUT_YOUR_WALLET_ADDRESS_HERE
```

```
Update the contract address displayed on the site to 0xPUT_THE_NEW_ADDRESS_HERE
```

```
Run the smart contract tests to make sure everything passes
```

---

### Set up API keys for production

```
Help me set up the API keys for this project so the burn-to-create feature works in production. Walk me through each one step by step. The services I need are Replicate (replicate.com), Pinata (pinata.cloud), and Upstash (upstash.com). After I get the keys, help me add them to Vercel.
```

---

### Move hosting to your own Vercel account

```
Help me transfer this project's Vercel hosting from the contributor's account to the megachadxyz organization's own Vercel account. Walk me through every step including installing the GitHub integration and importing the repo.
```

---

### Connect the megachad.xyz domain

```
Help me connect the megachad.xyz domain to our Vercel deployment. Tell me exactly what DNS records to add and where to add them.
```

---

### Understand the project

```
Explain this entire project to me like I'm five
```

```
What does the burn-to-create feature do? How does the 50/50 split work?
```

```
What file controls the roadmap section? Show me what's in it.
```

---

## WHEN TO USE WHICH AI

You have two AIs now. Here's when to use each:

| AI | How to open | Use it for |
|----|------------|------------|
| **Claude Code** | Terminal → type `claude` | **Almost everything.** Editing code, deploying, fixing bugs, running tests, pushing to GitHub. This is your main tool. |
| **Cursor chat** | Ctrl+L | Quick questions about a specific file you're looking at. Like "what does this line do?" |

Claude Code is the one doing the heavy lifting. Cursor chat is for when you're staring at a file and want a quick answer. Think of Claude Code as the contractor and Cursor chat as the guy you ask "what's that pipe for?"

You're basically a tech company now. CEO: Flatbread the Tadpole.

---

## WHAT'S DONE

- Full website (hero, about, burn-to-create, roadmap, notable chads, footer)
- Image carousel with music
- Wallet connect (MetaMask, Brave Wallet, Phantom, etc.)
- Burn-to-create: type a prompt, burn 1000 tokens, get AI art
- 50/50 split: 500 burned forever, 500 to dev wallet
- AI image generation (Replicate)
- IPFS permanent storage (Pinata)
- Gallery page
- Smart contract (14 tests passing)
- Pink is `#F786C6` (you're welcome)
- Buy links go to kumbaya.xyz

## WHAT'S NOT DONE

Just copy-paste the relevant prompt from above into Claude Code when you're ready. It does the work. You watch. Your specialty, Panini the Frog.

- Deploy the token contract
- Put the real contract address on the site
- Set up API keys on Vercel
- Move hosting to your own Vercel
- Connect megachad.xyz domain
- Add a favicon

---

## HOW THE SITE WORKS (you don't need to memorize this)

```
User connects wallet
  -> Types a prompt ("jacked chad on the moon")
  -> Clicks BURN (costs 1,000 $MEGACHAD)
  -> 500 tokens burned forever (deflationary)
  -> 500 tokens sent to dev wallet (funds the team)
  -> AI generates an image
  -> Image saved to IPFS permanently
  -> User gets their art
```

---

## IF YOU'RE TRULY STUCK

1. Ask Claude Code. Seriously. Just describe what's wrong.
2. If Claude Code is confused too, screenshot the error and send it in the group chat.
3. If Cursor itself won't open: uninstall it, reinstall it from https://cursor.com
4. If your computer is on fire: that's a you problem, Ciabatta the Gecko.

---

*Updated 2026-02-09. Believe in yourself Burger. We almost do.*
