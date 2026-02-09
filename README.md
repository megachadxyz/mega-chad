# Mega Chad NFT

Mint site and art pipeline: **Vercel** (host + API) + **Replicate** (image generation). NFT mint and revenue splits on **MegaETH** can be added next (Split + NFT contract, chain ID 4326 mainnet / 6342 testnet).

## What’s in this repo

- **Next.js 14** (App Router) — runs on Vercel.
- **Replicate** — `/api/generate` uses [Flux Schnell](https://replicate.com/black-forest-labs/flux-schnell) to generate images from a text prompt. You can switch to Flux 1.1 Pro or another model for higher quality or different style.
- **Mint UI** — placeholder; hook up your MegaETH contract and wallet (e.g. Wagmi + MegaETH chain ID 4326) when ready.

## Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/megachadxyz/mega-chad.git
   cd mega-chad
   npm install
   ```

2. **Replicate API token**
   - Go to [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) and create a token.
   - Copy `env.example` to `.env.local` and set:
     ```bash
     REPLICATE_API_TOKEN=r8_...
     ```

3. **Run locally**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000), enter a prompt, and click Generate.

4. **Deploy on Vercel**
   - Push this repo to GitHub and import the project in [Vercel](https://vercel.com).
   - Add `REPLICATE_API_TOKEN` in Project → Settings → Environment Variables.
   - Deploy; the mint site and `/api/generate` will be live.

## Next steps (MegaETH mint)

- Deploy your **Split** and **NFT contract** on MegaETH (testnet 6342, then mainnet 4326) per the MEGAETH plan.
- Add wallet connect and mint flow (e.g. Wagmi/viem, chain 4326).
- Point mint revenue to your Split address so payouts are automatic.

## Repo

[https://github.com/megachadxyz/mega-chad](https://github.com/megachadxyz/mega-chad)



