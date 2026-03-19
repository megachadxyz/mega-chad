'use client';

import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/main" className="back-link">← Back to App</Link>

        <h1>Documentation</h1>

        <section>
          <h2>Getting Started</h2>
          <p>
            Follow these steps to start looksmaxxing on MegaETH. You can also use the
            <Link href="/portal" className="inline-link"> Portal</Link> for a streamlined experience
            with natural language commands.
          </p>
        </section>

        <section>
          <h2>1. Set Up Your Wallet</h2>
          <h3>Install a Web3 Wallet</h3>
          <p>
            You'll need a Web3 wallet that supports custom networks. Recommended:
          </p>
          <ul>
            <li>MetaMask</li>
            <li>Brave Wallet</li>
            <li>Phantom</li>
          </ul>

          <h3>Add MegaETH Network</h3>
          <p>Network details (auto-added when you connect):</p>
          <ul>
            <li><strong>Network Name:</strong> MegaETH</li>
            <li><strong>Chain ID:</strong> 4326</li>
            <li><strong>RPC:</strong> https://mainnet.megaeth.com/rpc</li>
            <li><strong>WebSocket:</strong> wss://mainnet.megaeth.com/ws</li>
            <li><strong>Currency:</strong> ETH</li>
            <li><strong>Block Explorer:</strong> megaexplorer.xyz</li>
            <li><strong>Block Time:</strong> ~250ms</li>
          </ul>
        </section>

        <section>
          <h2>2. Get $MEGACHAD Tokens</h2>
          <p>
            You need 225,000 $MEGACHAD tokens to create a looksmaxxed image.
          </p>
          <p>
            <strong>Contract:</strong> 0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888
          </p>
          <p>
            <strong>How to buy:</strong> Bridge ETH to MegaETH via{' '}
            <a href="https://rabbithole.megaeth.com/bridge" target="_blank" rel="noopener noreferrer" className="external-link">Rabbithole</a>{' '}
            (supports Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, Scroll, zkSync, Linea),
            then swap on Kumbaya DEX. Or use the built-in swap widget on the{' '}
            <Link href="/main#buy" className="inline-link">main page</Link>.
          </p>
        </section>

        <section>
          <h2>3. Connect & Burn</h2>
          <ol>
            <li>Navigate to <Link href="/main" className="inline-link">/main</Link></li>
            <li>Click "CONNECT WALLET" and approve the connection</li>
            <li>Upload your portrait image (JPEG/PNG/WebP, max 4MB)</li>
            <li><strong>Optional:</strong> Enable "Store on-chain permanently with Warren" (~$5)</li>
            <li>Click "BURN & LOOKSMAXX"</li>
            <li>Approve two transactions: burn to dead address + transfer to tren fund</li>
            <li>AI generation begins automatically (1-2 minutes)</li>
            <li>Image pinned to IPFS, NFT minted to your wallet</li>
          </ol>
          <p className="note">
            <strong>Gasless option:</strong> Use the EIP-712 relayer to burn without gas fees.
            Approve the relayer contract once, then sign messages instead of transactions.
          </p>
        </section>

        <section>
          <h2>4. Storage Options</h2>

          <h3>IPFS (Default — Free)</h3>
          <ul>
            <li>Decentralized, content-addressed storage via Pinata</li>
            <li>Accessible via public IPFS gateways</li>
            <li>Included with every burn</li>
          </ul>

          <h3>Warren Protocol (Premium — ~$5)</h3>
          <ul>
            <li>Stored directly on-chain, truly immutable</li>
            <li>Cannot be removed or censored</li>
            <li>NFT metadata permanently references on-chain image</li>
          </ul>
        </section>

        <section>
          <h2>5. Portal & Natural Language Commands</h2>
          <p>
            The <Link href="/portal" className="inline-link">MegaETH Portal</Link> is your command center:
          </p>
          <ul>
            <li><strong>Portfolio:</strong> View all your MegaETH token balances (ETH, $MEGACHAD, WETH, USDm)</li>
            <li><strong>Protocols:</strong> Browse the MegaETH protocol directory</li>
            <li><strong>Activity:</strong> Live network stats and protocol metrics</li>
          </ul>
          <p>
            Use the NLP command bar to type natural language:
          </p>
          <ul>
            <li><code>"swap 0.1 ETH for megachad"</code> → get swap calldata</li>
            <li><code>"looksmaxx from base"</code> → cross-chain plan</li>
            <li><code>"check wallet 0x..."</code> → balance + eligibility</li>
            <li><code>"compare 0xABC vs 0xDEF"</code> → side-by-side comparison</li>
            <li><code>"show top burners"</code> → leaderboard</li>
            <li><code>"register me as an agent"</code> → agent registration calldata</li>
          </ul>
        </section>

        <section>
          <h2>6. Cross-Chain Looksmaxxing</h2>
          <p>
            You can looksmaxx from any of 10 supported chains without manually bridging:
          </p>
          <ul>
            <li>Ethereum, Base, Arbitrum, Optimism, Polygon</li>
            <li>BNB Chain, Avalanche, Scroll, zkSync Era, Linea</li>
          </ul>
          <p>
            The system builds a complete plan: bridge → swap → burn → generate → mint.
            Access via the NLP command bar, the <code>/api/cross-chain/intent</code> API, or
            the <code>cross_chain_looksmaxx</code> MCP tool.
          </p>
        </section>

        <section>
          <h2>7. Identity & Profiles</h2>
          <p>
            Every wallet has a <Link href="/profile/0x0000000000000000000000000000000000000000" className="inline-link">profile page</Link> that aggregates:
          </p>
          <ul>
            <li><strong>MegaNames:</strong> .mega domain name and social links</li>
            <li><strong>Burn history:</strong> All looksmaxxes with IPFS images</li>
            <li><strong>Tier:</strong> Unburned → Normie (1+) → Mewer (5+) → Mogger (20+) → Gigachad (50+) → Eternal Chad (100+)</li>
            <li><strong>Reputation:</strong> ERC-8004 on-chain rating from other users</li>
            <li><strong>Referral stats:</strong> If registered as an agent</li>
          </ul>
          <p>
            Profiles are queryable via <code>/api/identity/ADDRESS</code> by any MegaETH protocol.
          </p>
        </section>

        <section>
          <h2>8. Agent Referral Program</h2>
          <p>
            AI agents can register on-chain and earn commissions:
          </p>
          <ul>
            <li><strong>Reward:</strong> 11,250 $MEGACHAD (5%) per referred burn</li>
            <li><strong>Registration:</strong> Call <code>registerAgent()</code> on the referral contract or POST to <code>/api/agent/register</code></li>
            <li><strong>Referral code:</strong> Base64URL of your wallet address</li>
            <li><strong>Tracking:</strong> On-chain via <code>getAgentStats()</code> or <code>/api/agent/referrals</code></li>
          </ul>
        </section>

        <section>
          <h2>9. MCP Server Integration</h2>
          <p>
            MegaChad exposes a full MCP (Model Context Protocol) server with 19 tools:
          </p>
          <ul>
            <li><code>get_megachad_stats</code> — Protocol statistics</li>
            <li><code>get_swap_quote</code> — Kumbaya DEX quotes</li>
            <li><code>get_looksmaxx_requirements</code> — x402 + burn requirements</li>
            <li><code>get_gallery</code> — Recent looksmaxxed burns</li>
            <li><code>get_chadboard</code> — Top burners leaderboard</li>
            <li><code>get_wallet</code> — Balance + eligibility check</li>
            <li><code>get_gasless_burn</code> — EIP-712 gasless burn info</li>
            <li><code>register_agent</code> — Agent registration calldata</li>
            <li><code>get_bridge_info</code> — Bridge infrastructure</li>
            <li><code>get_price</code> — Live $MEGACHAD price</li>
            <li><code>get_agent_looksmaxx_plan</code> — Full burn plan with calldata</li>
            <li><code>get_referral_info</code> — Referral program details</li>
            <li><code>get_referral_stats</code> — Agent earnings</li>
            <li><code>chat_with_megachad</code> — Natural language transaction engine</li>
            <li><code>cross_chain_looksmaxx</code> — Cross-chain intent builder</li>
            <li><code>get_identity</code> — Unified identity/profile lookup</li>
            <li><code>get_portfolio</code> — MegaETH token balances</li>
            <li><code>get_megaeth_protocols</code> — Protocol directory</li>
            <li><code>get_events</code> — On-chain event stream</li>
          </ul>
          <p>
            Connect via <code>npx @anthropic-ai/claude-code mcp add megachad https://megachad.xyz/api/mcp</code> or
            add to your MCP client config.
          </p>
        </section>

        <section>
          <h2>10. API Reference</h2>
          <p>All endpoints are publicly accessible with CORS enabled.</p>

          <h3>Core</h3>
          <ul>
            <li><code>GET /api/stats</code> — Protocol statistics</li>
            <li><code>GET /api/price</code> — Current price + burn cost</li>
            <li><code>GET /api/wallet?address=0x...</code> — Balance check</li>
            <li><code>GET /api/gallery?limit=20</code> — Recent burns</li>
            <li><code>GET /api/chadboard</code> — Leaderboard</li>
          </ul>

          <h3>Generation & Minting</h3>
          <ul>
            <li><code>POST /api/generate</code> — Generate + mint (direct burn proof)</li>
            <li><code>GET|POST /api/x402/looksmaxx</code> — x402-aware looksmaxx</li>
            <li><code>GET /api/x402/quote?ethAmount=0.1</code> — Swap quote</li>
          </ul>

          <h3>Agent & Chat</h3>
          <ul>
            <li><code>POST /api/agent/chat</code> — Natural language transaction engine</li>
            <li><code>GET /api/agent/info</code> — Agent identity + ERC-8004</li>
            <li><code>GET|POST /api/agent/register</code> — Agent registration</li>
            <li><code>GET /api/agent/referrals?address=0x...</code> — Referral stats</li>
            <li><code>GET /api/agent/looksmaxx?wallet=0x...</code> — Full burn plan</li>
          </ul>

          <h3>Cross-Chain</h3>
          <ul>
            <li><code>GET /api/cross-chain/intent?sourceChain=base</code> — Build cross-chain plan</li>
            <li><code>POST /api/cross-chain/intent</code> — Submit intent for tracking</li>
            <li><code>GET /api/cross-chain/status?id=cc_...</code> — Track intent status</li>
          </ul>

          <h3>Identity & Portal</h3>
          <ul>
            <li><code>GET /api/identity/ADDRESS</code> — Unified identity profile</li>
            <li><code>GET /api/portal/tokens?address=0x...</code> — All MegaETH balances</li>
            <li><code>GET /api/portal/protocols</code> — Protocol directory</li>
          </ul>

          <h3>Infrastructure</h3>
          <ul>
            <li><code>GET /api/bridge</code> — Bridge info</li>
            <li><code>GET /api/gasless/burn?address=0x...</code> — EIP-712 gasless info</li>
            <li><code>GET /api/events</code> — On-chain event stream (SSE)</li>
          </ul>
        </section>

        <section>
          <h2>11. Troubleshooting</h2>

          <h3>Transaction Failed</h3>
          <ul>
            <li>Ensure you have enough ETH for gas on MegaETH</li>
            <li>Check $MEGACHAD balance (need 225,000 tokens)</li>
            <li>If using Warren, ensure ~$5 ETH for storage</li>
            <li>Try gasless burns to avoid gas issues</li>
          </ul>

          <h3>Wallet Won't Connect</h3>
          <ul>
            <li>Refresh the page and try again</li>
            <li>Ensure your wallet is unlocked and on MegaETH</li>
            <li>Try a different browser or wallet</li>
          </ul>

          <h3>Generation Issues</h3>
          <ul>
            <li>AI generation takes 1-2 minutes — don't close the page</li>
            <li>IPFS pinning adds 30-60 seconds</li>
            <li>Warren deployment adds 1-2 minutes if selected</li>
          </ul>
        </section>

        <section>
          <h2>12. Developer Resources</h2>
          <ul>
            <li>
              <strong>GitHub:</strong>{' '}
              <a href="https://github.com/megachadxyz/mega-chad" target="_blank" rel="noopener noreferrer" className="external-link">
                github.com/megachadxyz/mega-chad
              </a>
            </li>
            <li><strong>OpenAPI Spec:</strong>{' '}
              <a href="https://megachad.xyz/.well-known/openapi.json" target="_blank" rel="noopener noreferrer" className="external-link">
                megachad.xyz/.well-known/openapi.json
              </a>
            </li>
            <li><strong>Agent Discovery:</strong>{' '}
              <a href="https://megachad.xyz/.well-known/agent.json" target="_blank" rel="noopener noreferrer" className="external-link">
                megachad.xyz/.well-known/agent.json
              </a>
            </li>
            <li><strong>Smart Contracts:</strong> Verified on MegaETH Explorer</li>
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

        code {
          background: rgba(247,134,198,0.08);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.85em;
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
