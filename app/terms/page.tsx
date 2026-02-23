import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/" className="back-link">← Back to Home</Link>

        <h1>Terms of Service</h1>

        <p className="last-updated">Last Updated: February 23, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using MegaChad ("the Platform," "we," "our," or "us"), you agree to be
            bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not
            use the Platform.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and MegaChad. We reserve
            the right to modify these Terms at any time. Continued use after changes constitutes
            acceptance of the modified Terms.
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old to use MegaChad. By using the Platform, you represent
            and warrant that:
          </p>
          <ul>
            <li>You are at least 18 years of age</li>
            <li>You have the legal capacity to enter into these Terms</li>
            <li>You are not prohibited from using the Platform under applicable laws</li>
            <li>You will comply with all local, state, national, and international laws and regulations</li>
          </ul>
        </section>

        <section>
          <h2>3. Description of Service</h2>
          <p>
            MegaChad is a decentralized application (dApp) that allows users to:
          </p>
          <ul>
            <li>Burn $MEGACHAD tokens on the MegaETH blockchain</li>
            <li>Generate AI-created "looksmaxxed" images</li>
            <li>Receive NFTs representing their creations</li>
            <li>Store images permanently on IPFS</li>
            <li>Participate in community features (leaderboard, chat, gallery)</li>
          </ul>
          <p>
            The Platform is provided "as is" without warranties of any kind.
          </p>
        </section>

        <section>
          <h2>4. Burn Mechanism and Tokenomics</h2>
          <p>
            When you burn 225,000 $MEGACHAD tokens:
          </p>
          <ul>
            <li>112,500 tokens (50%) are permanently burned to the dead address (0x...dEaD)</li>
            <li>112,500 tokens (50%) are transferred to the Tren Fund wallet</li>
          </ul>
          <p className="warning">
            <strong>Important:</strong> Token burns are permanent and irreversible. Once burned,
            tokens cannot be recovered under any circumstances. You acknowledge and accept this risk.
          </p>
        </section>

        <section>
          <h2>5. Assumption of Risk</h2>
          <p>
            You acknowledge and agree that using blockchain technology and cryptocurrency involves
            significant risks, including but not limited to:
          </p>

          <h3>5.1 Financial Risks</h3>
          <ul>
            <li>Token values can be extremely volatile and may decrease to zero</li>
            <li>Burns are permanent; tokens cannot be recovered</li>
            <li>No guarantee of token value appreciation</li>
            <li>Gas fees on MegaETH may vary and are non-refundable</li>
            <li>Smart contract risks, including potential bugs or exploits</li>
          </ul>

          <h3>5.2 Technical Risks</h3>
          <ul>
            <li>Blockchain networks may experience downtime or congestion</li>
            <li>Wallet compromises or loss of private keys</li>
            <li>Third-party service failures (AI, IPFS, etc.)</li>
            <li>Software bugs or errors</li>
            <li>Network forks or chain reorganizations</li>
          </ul>

          <h3>5.3 Regulatory Risks</h3>
          <ul>
            <li>Cryptocurrency regulations vary by jurisdiction and may change</li>
            <li>Tax obligations may apply to your transactions</li>
            <li>Legal status of tokens and NFTs may be uncertain</li>
          </ul>

          <p className="warning">
            <strong>You assume all risks associated with using the Platform. We are not responsible
            for any losses you may incur.</strong>
          </p>
        </section>

        <section>
          <h2>6. No Investment Advice</h2>
          <p>
            Nothing on the Platform constitutes investment, financial, legal, or tax advice. The
            Platform is for entertainment and artistic purposes. You should consult with qualified
            professionals before making any financial decisions.
          </p>
          <p>
            <strong>$MEGACHAD tokens have no inherent value and should not be purchased with the
            expectation of profit.</strong>
          </p>
        </section>

        <section>
          <h2>7. Wallet Security</h2>
          <p>
            You are solely responsible for:
          </p>
          <ul>
            <li>Maintaining the security of your wallet and private keys</li>
            <li>All transactions initiated from your wallet address</li>
            <li>Verifying transaction details before signing</li>
            <li>Protecting your wallet from unauthorized access</li>
          </ul>
          <p>
            <strong>We never ask for your private keys or seed phrases. Never share these with anyone.</strong>
          </p>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>

          <h3>8.1 Generated Images</h3>
          <p>
            Images generated through the Platform are created using AI and stored on IPFS. By
            generating an image, you receive an NFT representing that image. Ownership rights are
            governed by blockchain records.
          </p>

          <h3>8.2 Platform Content</h3>
          <p>
            The MegaChad name, logo, website design, and code are owned by MegaChad or its licensors.
            You may not copy, modify, or distribute Platform content without permission.
          </p>
        </section>

        <section>
          <h2>9. Prohibited Uses</h2>
          <p>
            You agree NOT to:
          </p>
          <ul>
            <li>Use the Platform for any illegal purposes</li>
            <li>Attempt to manipulate or exploit the Platform or smart contracts</li>
            <li>Engage in wash trading or market manipulation</li>
            <li>Use automated bots or scripts without authorization</li>
            <li>Spam, harass, or abuse other users in chat</li>
            <li>Upload malicious code or attempt to hack the Platform</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Impersonate others or provide false information</li>
            <li>Generate images containing illegal, harmful, or offensive content</li>
          </ul>
        </section>

        <section>
          <h2>10. Chat and Community Guidelines</h2>
          <p>
            The burn-gated chat is a community feature. You agree to:
          </p>
          <ul>
            <li>Be respectful to other users</li>
            <li>Not post spam, scams, or malicious links</li>
            <li>Not engage in harassment or hate speech</li>
            <li>Not share illegal content</li>
          </ul>
          <p>
            We reserve the right to moderate, remove messages, or restrict access to users who
            violate these guidelines.
          </p>
        </section>

        <section>
          <h2>11. Third-Party Services</h2>
          <p>
            The Platform integrates with third-party services including:
          </p>
          <ul>
            <li>Replicate (AI generation)</li>
            <li>Pinata (IPFS storage)</li>
            <li>Upstash (data storage)</li>
            <li>Ably (real-time chat)</li>
            <li>Wallet providers (MetaMask, etc.)</li>
          </ul>
          <p>
            Your use of these services is subject to their respective terms of service. We are not
            responsible for third-party service failures or policy violations.
          </p>
        </section>

        <section>
          <h2>12. Disclaimer of Warranties</h2>
          <p>
            THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Warranties of merchantability or fitness for a particular purpose</li>
            <li>Warranties that the Platform will be uninterrupted or error-free</li>
            <li>Warranties regarding the accuracy or reliability of any information</li>
            <li>Warranties that smart contracts are bug-free or secure</li>
          </ul>
        </section>

        <section>
          <h2>13. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEGACHAD AND ITS OPERATORS SHALL NOT BE LIABLE FOR:
          </p>
          <ul>
            <li>Any direct, indirect, incidental, or consequential damages</li>
            <li>Loss of tokens, funds, or NFTs</li>
            <li>Loss of data or images</li>
            <li>Smart contract failures or exploits</li>
            <li>Third-party service failures</li>
            <li>Network downtime or transaction failures</li>
            <li>Any other damages arising from your use of the Platform</li>
          </ul>
          <p>
            YOUR SOLE REMEDY IS TO STOP USING THE PLATFORM.
          </p>
        </section>

        <section>
          <h2>14. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless MegaChad, its operators, and affiliates from
            any claims, damages, losses, or expenses (including legal fees) arising from:
          </p>
          <ul>
            <li>Your use of the Platform</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any laws or regulations</li>
            <li>Your violation of third-party rights</li>
          </ul>
        </section>

        <section>
          <h2>15. Smart Contract Risks</h2>
          <p>
            The Platform relies on smart contracts deployed on MegaETH. You acknowledge:
          </p>
          <ul>
            <li>Smart contracts are immutable once deployed</li>
            <li>Bugs or vulnerabilities may exist</li>
            <li>No upgrades or patches can fix deployed contracts</li>
            <li>You interact with smart contracts at your own risk</li>
          </ul>
          <p>
            <strong>Always verify contract addresses before interacting with them.</strong>
          </p>
        </section>

        <section>
          <h2>16. IPFS and Permanent Storage</h2>
          <p>
            Images and metadata are stored on IPFS, a decentralized storage network. You acknowledge:
          </p>
          <ul>
            <li>IPFS content is permanent and cannot be deleted</li>
            <li>IPFS content is publicly accessible to anyone with the hash</li>
            <li>We cannot control how IPFS nodes host or distribute content</li>
            <li>IPFS availability depends on network nodes (pinning services may fail)</li>
          </ul>
        </section>

        <section>
          <h2>17. Tax Obligations</h2>
          <p>
            You are solely responsible for determining and paying any taxes applicable to your use
            of the Platform, including but not limited to:
          </p>
          <ul>
            <li>Capital gains taxes on token transactions</li>
            <li>Income taxes on NFT sales</li>
            <li>Local sales or value-added taxes</li>
          </ul>
          <p>
            Consult with a tax professional regarding your obligations.
          </p>
        </section>

        <section>
          <h2>18. Termination</h2>
          <p>
            We reserve the right to:
          </p>
          <ul>
            <li>Modify or discontinue the Platform at any time without notice</li>
            <li>Restrict access to users who violate these Terms</li>
            <li>Remove or moderate user-generated content</li>
          </ul>
          <p>
            Note: Smart contracts on the blockchain will continue to function independently of the
            website interface.
          </p>
        </section>

        <section>
          <h2>19. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction where MegaChad operates, without
            regard to conflict of law provisions. Any disputes shall be resolved through binding
            arbitration or in the courts of that jurisdiction.
          </p>
        </section>

        <section>
          <h2>20. Severability</h2>
          <p>
            If any provision of these Terms is found to be invalid or unenforceable, the remaining
            provisions shall remain in full force and effect.
          </p>
        </section>

        <section>
          <h2>21. Entire Agreement</h2>
          <p>
            These Terms, along with our Privacy Policy, constitute the entire agreement between you
            and MegaChad regarding use of the Platform.
          </p>
        </section>

        <section>
          <h2>22. Contact</h2>
          <p>
            For questions about these Terms, contact us through our official community channels or
            social media accounts.
          </p>
        </section>

        <div className="legal-footer">
          <Link href="/privacy" className="related-link">Read Privacy Policy →</Link>
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

        .warning {
          background: var(--bg-card);
          border-left: 3px solid var(--pink);
          padding: 1rem;
          margin: 1rem 0;
          font-size: 0.95rem;
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
