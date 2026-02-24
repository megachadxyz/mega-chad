'use client';

import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/" className="back-link">← Back to Home</Link>

        <h1>Documentation</h1>

        <section>
          <h2>Getting Started</h2>
          <p>
            Follow these steps to start looksmaxxing on MegaETH:
          </p>
        </section>

        <section>
          <h2>1. Set Up Your Wallet</h2>
          <h3>Install a Web3 Wallet</h3>
          <p>
            You'll need a Web3 wallet that supports custom networks. We recommend:
          </p>
          <ul>
            <li>MetaMask</li>
            <li>Brave Wallet</li>
            <li>Phantom</li>
          </ul>

          <h3>Add MegaETH Network</h3>
          <p>Network details:</p>
          <ul>
            <li><strong>Network Name:</strong> MegaETH</li>
            <li><strong>Chain ID:</strong> 4326</li>
            <li><strong>Currency:</strong> ETH</li>
            <li><strong>Block Explorer:</strong> explorer.megaeth.com</li>
          </ul>
          <p className="note">
            Note: The site will automatically prompt you to add the MegaETH network when you connect your wallet.
          </p>
        </section>

        <section>
          <h2>2. Get $MEGACHAD Tokens</h2>
          <p>
            You'll need 225,000 $MEGACHAD tokens to create a looksmaxxed image.
          </p>
          <p>
            <strong>Contract Address:</strong> 0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888
          </p>
          <p>
            Acquire tokens through supported DEXs on MegaETH.
          </p>
        </section>

        <section>
          <h2>3. Connect Your Wallet</h2>
          <ol>
            <li>Navigate to the main app</li>
            <li>Click "CONNECT WALLET"</li>
            <li>Select your wallet from the options</li>
            <li>Approve the connection in your wallet</li>
            <li>Your wallet address and token balance will appear</li>
          </ol>
        </section>

        <section>
          <h2>4. Burn & Create</h2>
          <ol>
            <li>Ensure you have at least 225,000 $MEGACHAD tokens</li>
            <li>Upload your image</li>
            <li><strong>Optional:</strong> Check the "Store on-chain permanently with Warren" box for permanent on-chain storage (~$5)</li>
            <li>Click the "BURN & LOOKSMAXX" button</li>
            <li>Approve the first transaction (burn to dead address)</li>
            <li>Wait for confirmation</li>
            <li>Approve the second transaction (transfer to Tren Fund)</li>
            <li>Wait for confirmation</li>
            <li>AI generation will begin automatically</li>
            <li><strong>If Warren selected:</strong> Approve payment for on-chain storage, then wait for deployment</li>
            <li><strong>If IPFS only:</strong> Your image will be pinned to IPFS</li>
            <li>Your NFT will be minted</li>
          </ol>
          <p className="note">
            Note: The entire process takes 2-3 minutes (3-4 minutes with Warren). Do not close the browser during generation.
          </p>
        </section>

        <section>
          <h2>5. Storage Options: IPFS vs Warren</h2>

          <h3>Free Option: IPFS (Default)</h3>
          <p>
            Your image is automatically stored on IPFS (InterPlanetary File System) via Pinata:
          </p>
          <ul>
            <li><strong>Cost:</strong> Free (included with token burn)</li>
            <li><strong>Permanence:</strong> Decentralized, content-addressed storage</li>
            <li><strong>Access:</strong> Via IPFS gateways (public URLs)</li>
            <li><strong>Best for:</strong> Most users who want free, permanent storage</li>
          </ul>

          <h3>Premium Option: Warren Protocol</h3>
          <p>
            Upgrade to on-chain storage for maximum permanence and censorship resistance:
          </p>
          <ul>
            <li><strong>Cost:</strong> ~$5 (varies by image size, paid in ETH)</li>
            <li><strong>Permanence:</strong> Stored directly on-chain, truly immutable</li>
            <li><strong>Access:</strong> Via smart contract, cannot be removed or censored</li>
            <li><strong>NFT Metadata:</strong> Uses on-chain image URL instead of IPFS</li>
            <li><strong>Best for:</strong> Users who want absolute permanence and don't trust off-chain storage</li>
          </ul>

          <p className="note">
            Note: Warren storage is optional and can be selected before burning. Once deployed, your NFT will permanently reference the on-chain image. This choice cannot be changed after minting.
          </p>
        </section>

        <section>
          <h2>6. View Your Creation</h2>
          <p>
            Once complete, you can:
          </p>
          <ul>
            <li>Download your looksmaxxed image</li>
            <li>View on IPFS or Warren (depending on your storage choice)</li>
            <li>Share on social media (X/Twitter button included)</li>
            <li>View your NFT in your wallet or on the gallery</li>
          </ul>
        </section>

        <section>
          <h2>7. Additional Features</h2>

          <h3>Chadboard (Leaderboard)</h3>
          <p>
            View the top burners ranked by total burns. Access burn-gated chat to connect with
            other MegaChad holders who have burned tokens.
          </p>

          <h3>Gallery</h3>
          <p>
            Browse all looksmaxxed creations from the community. View burn transactions, timestamps,
            and storage links (IPFS or Warren).
          </p>
        </section>

        <section>
          <h2>8. Understanding the Burn Mechanism</h2>
          <p>
            When you burn 225,000 $MEGACHAD:
          </p>
          <ul>
            <li><strong>112,500 tokens</strong> are permanently burned (sent to dead address 0x...dEaD)</li>
            <li><strong>112,500 tokens</strong> go to the Tren Fund wallet</li>
          </ul>
          <p>
            This is <strong>irreversible</strong>. Make sure you have enough tokens before initiating.
          </p>
          <p className="note">
            Warren storage costs (~$5 ETH) are separate from the token burn and are paid directly to the Warren Protocol relayer for on-chain storage.
          </p>
        </section>

        <section>
          <h2>9. Troubleshooting</h2>

          <h3>Transaction Failed</h3>
          <ul>
            <li>Ensure you have enough ETH for gas fees on MegaETH</li>
            <li>Check you have sufficient $MEGACHAD balance (225,000 tokens)</li>
            <li>If using Warren, ensure you have ~$5 worth of ETH for storage payment</li>
            <li>Try increasing gas limit in your wallet</li>
          </ul>

          <h3>Wallet Won't Connect</h3>
          <ul>
            <li>Refresh the page</li>
            <li>Clear browser cache</li>
            <li>Ensure your wallet is unlocked</li>
            <li>Try a different browser or wallet</li>
          </ul>

          <h3>Generation Taking Too Long</h3>
          <ul>
            <li>AI generation can take 1-2 minutes</li>
            <li>IPFS pinning adds another 30-60 seconds</li>
            <li>Warren deployment adds another 1-2 minutes (if selected)</li>
            <li>Don't refresh the page during the process</li>
          </ul>

          <h3>Warren Payment Issues</h3>
          <ul>
            <li>If you cancel Warren payment, the system will fall back to IPFS storage</li>
            <li>Warren costs vary by image size (typically $2-5 for standard images)</li>
            <li>Once paid, Warren deployment cannot be cancelled</li>
          </ul>
        </section>

        <section>
          <h2>10. Security Best Practices</h2>
          <ul>
            <li>Never share your private keys or seed phrase</li>
            <li>Always verify the contract address before interacting</li>
            <li>Double-check transaction details before approving (especially Warren payment amounts)</li>
            <li>Use hardware wallets for large amounts</li>
            <li>Be aware that burns are permanent and irreversible</li>
            <li>Warren storage is immutable—your NFT will permanently use on-chain storage if selected</li>
          </ul>
        </section>

        <section>
          <h2>11. Developer Resources</h2>
          <p>
            MegaChad is open source and built in public. Explore our codebase, smart contracts,
            and contribute to the project.
          </p>
          <ul>
            <li>
              <strong>GitHub Repository:</strong>{' '}
              <a
                href="https://github.com/megachadxyz/mega-chad"
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                github.com/megachadxyz/mega-chad
              </a>
            </li>
            <li>
              <strong>Smart Contracts:</strong> Verified on MegaETH Explorer
            </li>
            <li>
              <strong>Storage:</strong> Dual-tier system with IPFS (Pinata) and Warren Protocol (on-chain)
            </li>
            <li>
              <strong>Warren Integration:</strong> Optional on-chain storage via{' '}
              <a
                href="https://thewarren.app"
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                thewarren.app
              </a>
            </li>
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

        .note {
          background: var(--bg-card);
          border-left: 3px solid var(--pink);
          padding: 1rem;
          margin: 1rem 0;
          font-size: 0.9rem;
          color: var(--pink-dim);
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

        .external-link {
          color: var(--pink);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .external-link:hover {
          opacity: 0.8;
          text-decoration: underline;
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
