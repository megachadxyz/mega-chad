'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/main" className="back-link">← Back to App</Link>

        <h1>About $MEGACHAD</h1>

        <section>
          <h2>What is MegaChad?</h2>
          <p>
            MegaChad is a burn-to-create looksmaxxing engine on MegaETH. Users burn $MEGACHAD tokens
            to generate AI-enhanced portraits and mint them as NFTs. It also serves as MegaETH's
            universal portal — a command center for portfolio management, cross-chain operations,
            protocol discovery, and on-chain identity.
          </p>
        </section>

        <section>
          <h2>How It Works</h2>
          <ol>
            <li><strong>Burn Tokens:</strong> Users burn 225,000 $MEGACHAD tokens per creation (112,500 burned forever + 112,500 to tren fund)</li>
            <li><strong>AI Generation:</strong> Replicate (Flux 2 Max) generates a professional looksmaxxed portrait</li>
            <li><strong>Storage:</strong> Choose between free IPFS storage or permanent on-chain storage via Warren Protocol (~$5)</li>
            <li><strong>NFT Minting:</strong> Receive an ERC-721 NFT on MegaETH representing your creation</li>
          </ol>
        </section>

        <section>
          <h2>Tokenomics</h2>
          <p>
            When you burn 225,000 $MEGACHAD tokens:
          </p>
          <ul>
            <li><strong>112,500 tokens (50%)</strong> are sent to the dead address (0x...dEaD) — permanently destroyed</li>
            <li><strong>112,500 tokens (50%)</strong> go to the Tren Fund wallet</li>
          </ul>
          <p>
            This deflationary mechanism reduces total supply with every burn. With referral burns,
            the split is 50% burned, 45% tren fund, 5% referrer agent.
          </p>
          <p>
            <strong>Infra Fee:</strong> 1 USDm per looksmaxx covers AI generation and IPFS pinning costs,
            paid via Meridian x402 protocol.
          </p>
        </section>

        <section>
          <h2>Platform Features</h2>

          <h3>Burn-to-Create Engine</h3>
          <p>
            The core product. Burn $MEGACHAD, upload a portrait, and receive an AI-enhanced looksmaxxed
            NFT. Supports gasless burns via EIP-712 relayer — no gas fees needed.
          </p>

          <h3>MegaETH Universal Portal</h3>
          <p>
            Your MegaETH command center at <Link href="/portal" className="inline-link">/portal</Link>.
            View all token balances, browse the protocol directory, check live network stats, and
            execute natural language commands. One place for everything on MegaETH.
          </p>

          <h3>Cross-Chain Intents</h3>
          <p>
            Looksmaxx from any chain — Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche,
            Scroll, zkSync, or Linea. The system builds a complete bridge → swap → burn → generate → mint
            plan automatically. Works for both humans and AI agents.
          </p>

          <h3>Natural Language Transaction Engine</h3>
          <p>
            Type what you want in plain English — "swap 0.1 ETH for megachad and burn it" or
            "looksmaxx from base" — and get back structured responses with ready-to-sign calldata.
            Powered by Claude AI with regex fallback.
          </p>

          <h3>Identity Layer</h3>
          <p>
            Every wallet gets a rich on-chain profile at <Link href="/profile/0x0000000000000000000000000000000000000000" className="inline-link">/profile</Link>:
            MegaNames (.mega domains), burn history, reputation score (ERC-8004), referral stats,
            and tier level (Normie → Mewer → Bonesmasher → Chad → Gigachad). Queryable by any
            MegaETH protocol.
          </p>

          <h3>Agent Referral Economy</h3>
          <p>
            AI agents register on-chain and earn 11,250 $MEGACHAD (5%) per referred burn.
            Full MCP integration with 20 tools for autonomous agent operations.
          </p>

          <h3>Chadboard</h3>
          <p>
            <Link href="/chadboard" className="inline-link">Chadboard</Link> ranks top burners with
            tier badges, ERC-8004 reputation scores, MegaNames profiles, and identity details.
            Click any burner to see their creations, rate them on-chain, or visit their full profile.
            All .mega domain holders also appear on the Chadboard.
          </p>

          <h3>ChadChat</h3>
          <p>
            Burn-gated real-time messaging for $MEGACHAD holders. ChadChat is accessible from the
            Chadboard — only wallets that have burned at least once (Mewer tier or above) can send
            messages. Powered by Ably for instant delivery.
          </p>

          <h3>Telegram Alerts</h3>
          <p>
            Real-time burn and mint notifications via the MegaChad Telegram bot. Get alerted
            when new burns happen, leaderboard changes, and protocol milestones are reached.
            Join at <a href="https://t.me/megachads" target="_blank" rel="noopener noreferrer" className="inline-link">t.me/megachads</a>.
          </p>

          <h3>Farcaster Frames</h3>
          <p>
            Frame-based burn gallery, leaderboard, and price discovery for Farcaster. Browse
            looksmaxxed creations and check stats without leaving your feed.
          </p>

          <h3>x402 Payments</h3>
          <p>
            MegaChad uses the HTTP 402 payment protocol via Meridian for API monetization.
            The 1 USDm infra fee per looksmaxx covers AI generation and IPFS pinning costs,
            paid seamlessly through x402 payment headers.
          </p>

          <h3>ERC-8004 Agent Identity</h3>
          <p>
            MegaChad is registered as on-chain Agent #12408 on the ERC-8004 Identity Registry.
            The Reputation Registry allows anyone to leave on-chain feedback — scores are
            aggregated and displayed on the Chadboard.
          </p>

          <h3>MEGA Protocol Governance</h3>
          <p>
            The MEGA Protocol is MegaChad's governance layer. Burning $MEGACHAD via Framemogger
            earns governance rights and mints $MEGAGOONER — the governance and reward token
            (50M supply cap, 225-week quadratic emission schedule).
          </p>
          <ul>
            <li><strong>$MEGAGOONER:</strong> Governance token earned through burning and staking</li>
            <li><strong>Framemogger:</strong> Burn $MEGACHAD to earn governance rights and $MEGAGOONER rewards</li>
            <li><strong>MoggerStaking:</strong> Stake $MEGACHAD to earn $MEGAGOONER over time</li>
            <li><strong>JESTERGOONER:</strong> Stake LP tokens to earn $MEGAGOONER</li>
            <li><strong>Jestermogger:</strong> Governance voting — top 3 $MEGACHAD burners can propose, $MEGAGOONER holders vote</li>
          </ul>
          <p>
            All MEGA Protocol contracts are UUPS upgradeable proxies deployed on MegaETH.
          </p>
        </section>

        <section>
          <h2>Technology Stack</h2>
          <ul>
            <li><strong>Blockchain:</strong> MegaETH (chain ID 4326, ~250ms blocks, 100k+ TPS)</li>
            <li><strong>Smart Contracts:</strong> MegaChadToken (ERC-20 burn), MegaCHADNFT (ERC-721), MegaChadRelayer (EIP-712 gasless), MegaChadReferral (agent economy)</li>
            <li><strong>AI:</strong> Replicate (Flux 2 Max model)</li>
            <li><strong>Storage:</strong> IPFS via Pinata (free) + Warren Protocol (on-chain, ~$5)</li>
            <li><strong>Payments:</strong> Meridian x402 protocol (HTTP 402 standard, USDm stablecoin)</li>
            <li><strong>Identity:</strong> ERC-8004 Agent Registry + MegaNames .mega domains</li>
            <li><strong>Agent Integration:</strong> MCP server (20 tools), natural language chat, cross-chain intents</li>
            <li><strong>Frontend:</strong> Next.js 14 + wagmi + viem</li>
            <li><strong>Cross-Chain:</strong> 10 source chains via Rabbithole + canonical MegaETH Bridge</li>
            <li><strong>Social:</strong> Telegram bot, Farcaster frames, burn-gated chat (Ably)</li>
          </ul>
        </section>

        <section>
          <h2>Smart Contracts</h2>
          <ul>
            <li><strong>$MEGACHAD Token:</strong> 0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888</li>
            <li><strong>MegaCHAD NFT:</strong> ERC-721 with IPFS/Warren metadata</li>
            <li><strong>Gasless Relayer:</strong> 0x87d67c0A351FeB2bB9F6985D55665544F94ebC9F (EIP-712)</li>
            <li><strong>Referral Contract:</strong> 0xf85004d10AbA6200669FeB12C81d356027312181</li>
            <li><strong>ERC-8004 Identity:</strong> 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432</li>
            <li><strong>ERC-8004 Reputation:</strong> 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63</li>
          </ul>
        </section>

        <section>
          <h2>Open Source</h2>
          <p>
            MegaChad is built in public. Our entire codebase — frontend, smart contracts, and
            infrastructure — is open source on GitHub.
          </p>
          <p>
            <a
              href="https://github.com/megachadxyz/mega-chad"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
            >
              View on GitHub →
            </a>
          </p>
        </section>

        <section>
          <h2>Community</h2>
          <p>
            Join the MegaChad community to share your looksmaxxed creations, compete on the Chadboard
            leaderboard, and participate in burn-gated ChadChat.
          </p>
          <ul>
            <li><a href="https://t.me/megachads" target="_blank" rel="noopener noreferrer" className="github-link">Telegram</a></li>
          </ul>
        </section>

        <div className="legal-footer">
          <Link href="/main" className="action-link">Start Looksmaxxing →</Link>
        </div>
      </div>

      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          padding: 2rem;
          background: var(--bg);
        }

        .legal-container {
          max-width: 800px;
          margin: 0 auto;
          color: var(--text);
          font-family: var(--font-body);
          line-height: 1.7;
        }

        .back-link {
          display: inline-block;
          color: var(--pink);
          text-decoration: none;
          margin-bottom: 2rem;
          font-size: 0.9rem;
          transition: opacity 0.2s;
        }

        .back-link:hover {
          opacity: 0.8;
        }

        h1 {
          font-family: var(--font-display);
          font-size: 3rem;
          color: var(--pink);
          margin-bottom: 2rem;
          letter-spacing: 0.05em;
          text-shadow: var(--pink-glow);
        }

        h2 {
          font-family: var(--font-display);
          font-size: 1.8rem;
          color: var(--text);
          margin-top: 2rem;
          margin-bottom: 1rem;
          letter-spacing: 0.03em;
        }

        h3 {
          font-family: var(--font-display);
          font-size: 1.3rem;
          color: var(--pink-dim);
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: 0.02em;
        }

        section {
          margin-bottom: 2.5rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        section:last-of-type {
          border-bottom: none;
        }

        p {
          margin-bottom: 1rem;
          color: var(--text);
        }

        ul, ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }

        li {
          margin-bottom: 0.5rem;
          color: var(--text);
        }

        strong {
          color: var(--pink);
        }

        .inline-link {
          color: var(--pink);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .inline-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .legal-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .action-link {
          display: inline-block;
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: var(--pink);
          text-decoration: none;
          padding: 1rem 2rem;
          border: 2px solid var(--pink);
          transition: all 0.3s;
          letter-spacing: 0.05em;
        }

        .action-link:hover {
          background: var(--pink);
          color: #000;
          box-shadow: var(--pink-glow);
        }

        .github-link {
          color: var(--pink);
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .github-link:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .legal-page {
            padding: 1rem;
          }

          h1 {
            font-size: 2rem;
          }

          h2 {
            font-size: 1.5rem;
          }

          h3 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
