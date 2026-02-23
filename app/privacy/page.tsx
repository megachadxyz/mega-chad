import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/" className="back-link">← Back to Home</Link>

        <h1>Privacy Policy</h1>

        <p className="last-updated">Last Updated: February 23, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to MegaChad ("we," "our," or "us"). This Privacy Policy explains how we collect,
            use, and protect information when you use our decentralized application (dApp) for
            burning $MEGACHAD tokens and generating AI art on the MegaETH blockchain.
          </p>
          <p>
            We are committed to protecting your privacy and being transparent about our data practices.
            By using MegaChad, you agree to the collection and use of information in accordance with
            this policy.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>

          <h3>2.1 Blockchain Data (Public & Permanent)</h3>
          <p>
            When you interact with our smart contracts, the following information is recorded on the
            MegaETH blockchain and is publicly visible:
          </p>
          <ul>
            <li>Your wallet address</li>
            <li>Transaction hashes</li>
            <li>Token burn amounts and timestamps</li>
            <li>NFT minting records</li>
          </ul>
          <p className="note">
            This data is permanent, public, and cannot be deleted as it exists on the blockchain.
          </p>

          <h3>2.2 Application Data</h3>
          <p>We collect and store the following application data:</p>
          <ul>
            <li><strong>Burn Records:</strong> Transaction hashes, wallet addresses, timestamps, and burn counts</li>
            <li><strong>Generated Images:</strong> AI-generated images stored on IPFS with associated metadata</li>
            <li><strong>Chat Messages:</strong> Messages sent in the Chadboard chat (burn-gated feature)</li>
            <li><strong>Display Names:</strong> Optional user-set display names for chat</li>
          </ul>

          <h3>2.3 Technical Data</h3>
          <p>Our service providers may collect:</p>
          <ul>
            <li>IP addresses (for rate limiting and abuse prevention)</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Usage patterns and error logs</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use collected information for the following purposes:</p>
          <ul>
            <li><strong>Service Delivery:</strong> Processing burns, generating images, minting NFTs</li>
            <li><strong>Burn Verification:</strong> Verifying on-chain burns to gate access to features</li>
            <li><strong>Leaderboard:</strong> Displaying burn statistics on the Chadboard</li>
            <li><strong>Gallery:</strong> Displaying generated images and metadata publicly</li>
            <li><strong>Chat System:</strong> Enabling burn-gated community chat</li>
            <li><strong>Analytics:</strong> Understanding usage patterns and improving the platform</li>
            <li><strong>Security:</strong> Preventing abuse, fraud, and spam</li>
          </ul>
        </section>

        <section>
          <h2>4. Third-Party Services</h2>
          <p>
            We use the following third-party services to operate MegaChad. Each has its own privacy
            policy:
          </p>

          <h3>4.1 Replicate (AI Generation)</h3>
          <p>
            We use Replicate's API to generate AI images. Images are processed on their servers.
            <br />Privacy Policy: <a href="https://replicate.com/privacy" target="_blank" rel="noopener noreferrer">replicate.com/privacy</a>
          </p>

          <h3>4.2 Pinata (IPFS Storage)</h3>
          <p>
            Generated images and metadata are permanently stored on IPFS via Pinata.
            <br />Privacy Policy: <a href="https://www.pinata.cloud/privacy" target="_blank" rel="noopener noreferrer">pinata.cloud/privacy</a>
          </p>

          <h3>4.3 Upstash Redis (Data Storage)</h3>
          <p>
            We use Upstash Redis to store burn records, chat messages, and application state.
            <br />Privacy Policy: <a href="https://upstash.com/privacy" target="_blank" rel="noopener noreferrer">upstash.com/privacy</a>
          </p>

          <h3>4.4 Ably (Real-time Chat)</h3>
          <p>
            Chat functionality is powered by Ably's real-time messaging service.
            <br />Privacy Policy: <a href="https://ably.com/privacy" target="_blank" rel="noopener noreferrer">ably.com/privacy</a>
          </p>

          <h3>4.5 MegaETH Blockchain</h3>
          <p>
            All token transactions occur on the MegaETH blockchain, which is public and permanent.
          </p>
        </section>

        <section>
          <h2>5. Data Storage and Retention</h2>
          <ul>
            <li><strong>Blockchain Data:</strong> Permanent and immutable on MegaETH</li>
            <li><strong>IPFS Data:</strong> Permanent and distributed across IPFS network</li>
            <li><strong>Application Data:</strong> Stored indefinitely in Upstash Redis for service functionality</li>
            <li><strong>Chat Messages:</strong> Stored indefinitely but may be moderated for policy violations</li>
          </ul>
        </section>

        <section>
          <h2>6. Data Sharing</h2>
          <p>We do not sell, trade, or rent your personal information to third parties.</p>
          <p>Data is shared only with:</p>
          <ul>
            <li>Service providers necessary to operate the platform (listed in Section 4)</li>
            <li>Public blockchain networks (wallet addresses and transactions are inherently public)</li>
            <li>IPFS network (images and metadata are public and permanent)</li>
          </ul>
        </section>

        <section>
          <h2>7. Public Nature of Blockchain</h2>
          <p className="warning">
            <strong>Important:</strong> Blockchain transactions are public and permanent. Your wallet
            address, burn amounts, and NFT ownership are visible to anyone with blockchain explorer
            access. This is a fundamental characteristic of blockchain technology and cannot be changed.
          </p>
        </section>

        <section>
          <h2>8. Cookies and Tracking</h2>
          <p>
            We use minimal cookies and local storage for:
          </p>
          <ul>
            <li>Maintaining wallet connection state</li>
            <li>Storing user preferences (display names)</li>
            <li>Session management</li>
          </ul>
          <p>
            We do not use advertising cookies or third-party tracking pixels.
          </p>
        </section>

        <section>
          <h2>9. Security</h2>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul>
            <li>Encrypted data transmission (HTTPS/SSL)</li>
            <li>Secure API endpoints with authentication</li>
            <li>Rate limiting to prevent abuse</li>
            <li>Regular security audits</li>
          </ul>
          <p>
            However, no method of transmission over the internet is 100% secure. We cannot guarantee
            absolute security.
          </p>
        </section>

        <section>
          <h2>10. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of data (where technically possible)</li>
            <li>Object to data processing</li>
            <li>Data portability</li>
          </ul>
          <p className="note">
            Note: Blockchain and IPFS data cannot be deleted or modified due to their decentralized,
            permanent nature.
          </p>
        </section>

        <section>
          <h2>11. Children's Privacy</h2>
          <p>
            MegaChad is not intended for users under 18 years of age. We do not knowingly collect
            information from children. If you believe a child has provided us with personal information,
            please contact us.
          </p>
        </section>

        <section>
          <h2>12. International Users</h2>
          <p>
            Our services are provided globally. By using MegaChad, you consent to the transfer of
            your information to the United States and other jurisdictions where our service providers
            operate.
          </p>
        </section>

        <section>
          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated "Last Updated" date. Continued use of the platform after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>14. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact us
            through our community channels or via the MegaChad social media accounts.
          </p>
        </section>

        <div className="legal-footer">
          <Link href="/terms" className="related-link">Read Terms of Service →</Link>
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
          font-size: 0.95rem;
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

        .last-updated {
          color: var(--text-dim);
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }

        h1 {
          font-family: var(--font-display);
          font-size: 3rem;
          color: var(--pink);
          margin-bottom: 1rem;
          letter-spacing: 0.05em;
          text-shadow: var(--pink-glow);
        }

        h2 {
          font-family: var(--font-display);
          font-size: 1.6rem;
          color: var(--text);
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          letter-spacing: 0.03em;
        }

        h3 {
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--pink-dim);
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: 0.02em;
        }

        section {
          margin-bottom: 2rem;
        }

        p {
          margin-bottom: 1rem;
          color: var(--text);
        }

        .note {
          background: var(--bg-card);
          border-left: 3px solid var(--pink-dim);
          padding: 1rem;
          margin: 1rem 0;
          font-size: 0.9rem;
          color: var(--text);
        }

        .warning {
          background: var(--bg-card);
          border-left: 3px solid var(--pink);
          padding: 1rem;
          margin: 1rem 0;
          font-size: 0.9rem;
          color: var(--pink);
        }

        ul, ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }

        li {
          margin-bottom: 0.75rem;
          color: var(--text);
        }

        strong {
          color: var(--pink-dim);
          font-weight: 600;
        }

        a {
          color: var(--pink);
          text-decoration: underline;
          transition: opacity 0.2s;
        }

        a:hover {
          opacity: 0.8;
        }

        .legal-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .related-link {
          display: inline-block;
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--pink);
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border: 2px solid var(--pink);
          transition: all 0.3s;
          letter-spacing: 0.05em;
        }

        .related-link:hover {
          background: var(--pink);
          color: #000;
          box-shadow: var(--pink-glow);
        }

        @media (max-width: 768px) {
          .legal-page {
            padding: 1rem;
          }

          .legal-container {
            font-size: 0.9rem;
          }

          h1 {
            font-size: 2rem;
          }

          h2 {
            font-size: 1.4rem;
          }

          h3 {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
}
