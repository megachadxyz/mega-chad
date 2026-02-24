'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/" className="back-link">← Back to Home</Link>

        <h1>About $MEGACHAD</h1>

        <section>
          <h2>What is MegaChad?</h2>
          <p>
            MegaChad is a burn-to-create platform built on MegaETH where users burn $MEGACHAD tokens
            to generate AI-enhanced "looksmaxxed" images. Each burn creates a unique piece of art that
            is permanently stored on IPFS and can be minted as an NFT.
          </p>
        </section>

        <section>
          <h2>How It Works</h2>
          <ol>
            <li><strong>Burn Tokens:</strong> Users burn 225,000 $MEGACHAD tokens per creation</li>
            <li><strong>AI Generation:</strong> Our AI (Flux 2 Max) generates a professional looksmaxxed portrait</li>
            <li><strong>Storage Options:</strong> Choose between free IPFS storage or permanent on-chain storage via Warren Protocol (~$5)</li>
            <li><strong>NFT Minting:</strong> Receive an NFT representing your unique creation</li>
          </ol>
        </section>

        <section>
          <h2>Tokenomics</h2>
          <p>
            When you burn 225,000 $MEGACHAD tokens:
          </p>
          <ul>
            <li><strong>112,500 tokens (50%)</strong> are sent to the dead address (permanent burn)</li>
            <li><strong>112,500 tokens (50%)</strong> go to the Tren Fund wallet</li>
          </ul>
          <p>
            This deflationary mechanism reduces the total supply with every burn, making $MEGACHAD
            increasingly scarce over time.
          </p>
        </section>

        <section>
          <h2>Technology Stack</h2>
          <ul>
            <li><strong>Blockchain:</strong> MegaETH (ultra-fast L2)</li>
            <li><strong>Smart Contracts:</strong> ERC-20 token with custom burn mechanism, ERC-721 NFTs</li>
            <li><strong>AI:</strong> Replicate (Flux 2 Max model)</li>
            <li><strong>Storage:</strong> Dual-tier storage system
              <ul>
                <li>Free: IPFS via Pinata (decentralized, permanent)</li>
                <li>Premium: Warren Protocol (on-chain, immutable, censorship-resistant)</li>
              </ul>
            </li>
            <li><strong>Frontend:</strong> Next.js 14 with Web3 integration</li>
          </ul>
        </section>

        <section>
          <h2>Open Source</h2>
          <p>
            MegaChad is built in public. Our entire codebase—frontend, smart contracts, and infrastructure—is
            open source and available on GitHub. Community contributions, feedback, and transparency are core
            to our mission.
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
            leaderboard, and participate in burn-gated chat with other holders.
          </p>
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
        }
      `}</style>
    </div>
  );
}
