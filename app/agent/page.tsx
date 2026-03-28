'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  date: string;
  totalApiCalls: number;
  uniqueCallers: number;
  endpoints: Record<string, number>;
  mcpTools: Record<string, number>;
}

interface AgentInfo {
  registration: {
    type: string;
    name: string;
    description: string;
    image: string;
    services: { name: string; endpoint: string; version: string }[];
    x402Support: boolean;
    active: boolean;
    registrations: { agentId: number; agentRegistry: string }[];
    supportedTrust: string[];
  };
  onChain: {
    agentId: string | null;
    agentURI: string | null;
    owner: string | null;
    wallet: string | null;
    reputationClients: number;
  };
  contracts: {
    identityRegistry: string;
    reputationRegistry: string;
  };
  status: string;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgentPage() {
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent/info', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setInfo)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch('/api/analytics', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setAnalyticsLoading(false));
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/" className="back-link">&larr; Back to Home</Link>

        <h1>Agent Identity</h1>
        <p className="agent-subtitle">ERC-8004 Trustless Agent Profile</p>

        {loading && <p className="agent-loading">Loading agent data...</p>}

        {info && (
          <>
            {/* Status Badge */}
            <div className="agent-status-row">
              <span className={`agent-badge ${info.status === 'registered' ? 'agent-badge-live' : 'agent-badge-pending'}`}>
                {info.status === 'registered' ? 'REGISTERED ON-CHAIN' : 'PENDING REGISTRATION'}
              </span>
              {info.registration.active && (
                <span className="agent-badge agent-badge-live">ACTIVE</span>
              )}
              {info.registration.x402Support && (
                <span className="agent-badge agent-badge-x402">x402 ENABLED</span>
              )}
            </div>

            {/* Identity Card */}
            <section className="agent-card">
              <h2>{info.registration.name}</h2>
              <p>{info.registration.description}</p>

              {info.onChain.agentId && (
                <div className="agent-detail-grid">
                  <div className="agent-detail">
                    <span className="agent-label">Agent ID</span>
                    <span className="agent-value">#{info.onChain.agentId}</span>
                  </div>
                  <div className="agent-detail">
                    <span className="agent-label">Owner</span>
                    <span className="agent-value">{info.onChain.owner ? truncAddr(info.onChain.owner) : '—'}</span>
                  </div>
                  <div className="agent-detail">
                    <span className="agent-label">Wallet</span>
                    <span className="agent-value">{info.onChain.wallet ? truncAddr(info.onChain.wallet) : '—'}</span>
                  </div>
                  <div className="agent-detail">
                    <span className="agent-label">Reputation Clients</span>
                    <span className="agent-value">{info.onChain.reputationClients}</span>
                  </div>
                </div>
              )}
            </section>

            {/* Services */}
            <section className="agent-card">
              <h2>Services</h2>
              <div className="agent-services">
                {info.registration.services.map((svc) => (
                  <div key={svc.name} className="agent-service">
                    <div className="agent-service-header">
                      <span className="agent-service-name">{svc.name}</span>
                      <span className="agent-service-version">v{svc.version}</span>
                    </div>
                    <code className="agent-service-endpoint">{svc.endpoint}</code>
                  </div>
                ))}
              </div>
            </section>

            {/* Contracts */}
            <section className="agent-card">
              <h2>ERC-8004 Contracts (MegaETH)</h2>
              <div className="agent-contracts">
                <div className="agent-contract">
                  <span className="agent-label">Identity Registry</span>
                  <a
                    href={`https://megaexplorer.xyz/address/${info.contracts.identityRegistry}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="agent-contract-link"
                  >
                    {truncAddr(info.contracts.identityRegistry)}
                  </a>
                </div>
                <div className="agent-contract">
                  <span className="agent-label">Reputation Registry</span>
                  <a
                    href={`https://megaexplorer.xyz/address/${info.contracts.reputationRegistry}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="agent-contract-link"
                  >
                    {truncAddr(info.contracts.reputationRegistry)}
                  </a>
                </div>
              </div>
            </section>

            {/* Trust */}
            <section className="agent-card">
              <h2>Trust & Discovery</h2>
              <ul className="agent-trust-list">
                <li>
                  <strong>Reputation:</strong> On-chain feedback via ERC-8004 Reputation Registry
                </li>
                <li>
                  <strong>x402 Payments:</strong> Meridian x402 payment-gated API access (USDm)
                </li>
                <li>
                  <strong>Discovery:</strong>{' '}
                  <a href="/.well-known/agent-registration.json" target="_blank" rel="noopener noreferrer">
                    /.well-known/agent-registration.json
                  </a>
                </li>
                <li>
                  <strong>API:</strong>{' '}
                  <a href="/api/agent/info" target="_blank" rel="noopener noreferrer">
                    /api/agent/info
                  </a>
                </li>
              </ul>
            </section>

            {/* Integration Info */}
            <section className="agent-card">
              <h2>For Developers & Agents</h2>
              <p>
                MegaChad exposes its services via standard ERC-8004 registration.
                AI agents and protocols on MegaETH can discover and interact with
                MegaChad programmatically.
              </p>
              <div className="agent-code-block">
                <pre>{`// Discover MegaChad
GET https://megachad.xyz/.well-known/agent-registration.json

// Query agent info
GET https://megachad.xyz/api/agent/info

// Burn-to-create (x402 payment-gated)
POST https://megachad.xyz/api/x402/looksmaxx

// Chadboard leaderboard
GET https://megachad.xyz/api/chadboard

// Protocol stats
GET https://megachad.xyz/api/stats`}</pre>
              </div>
            </section>
          </>
        )}

        {/* Agent Analytics */}
        <section className="agent-card analytics-section">
          <h2>Agent Analytics</h2>
          {analyticsLoading && <p className="agent-loading">Loading analytics...</p>}
          {analytics && (
            <>
              <div className="analytics-stats-row">
                <div className="analytics-stat">
                  <span className="analytics-stat-value">{analytics.totalApiCalls.toLocaleString()}</span>
                  <span className="analytics-stat-label">API Calls Today</span>
                </div>
                <div className="analytics-stat">
                  <span className="analytics-stat-value">{analytics.uniqueCallers.toLocaleString()}</span>
                  <span className="analytics-stat-label">Unique Callers</span>
                </div>
                <div className="analytics-stat">
                  <span className="analytics-stat-value">{Object.keys(analytics.endpoints).length}</span>
                  <span className="analytics-stat-label">Active Endpoints</span>
                </div>
                <div className="analytics-stat">
                  <span className="analytics-stat-value">{Object.keys(analytics.mcpTools).length}</span>
                  <span className="analytics-stat-label">MCP Tools Used</span>
                </div>
              </div>

              {Object.keys(analytics.endpoints).length > 0 && (
                <div className="analytics-breakdown">
                  <h3>Top Endpoints</h3>
                  <div className="analytics-bar-list">
                    {Object.entries(analytics.endpoints)
                      .slice(0, 10)
                      .map(([endpoint, count]) => {
                        const maxCount = Math.max(...Object.values(analytics.endpoints));
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={endpoint} className="analytics-bar-item">
                            <div className="analytics-bar-label">
                              <span className="analytics-bar-endpoint">{endpoint}</span>
                              <span className="analytics-bar-count">{count.toLocaleString()}</span>
                            </div>
                            <div className="analytics-bar-track">
                              <div className="analytics-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {Object.keys(analytics.mcpTools).length > 0 && (
                <div className="analytics-breakdown">
                  <h3>MCP Tool Usage</h3>
                  <div className="analytics-bar-list">
                    {Object.entries(analytics.mcpTools)
                      .slice(0, 10)
                      .map(([tool, count]) => {
                        const maxCount = Math.max(...Object.values(analytics.mcpTools));
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={tool} className="analytics-bar-item">
                            <div className="analytics-bar-label">
                              <span className="analytics-bar-endpoint">{tool}</span>
                              <span className="analytics-bar-count">{count.toLocaleString()}</span>
                            </div>
                            <div className="analytics-bar-track">
                              <div className="analytics-bar-fill analytics-bar-fill-mcp" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <p className="analytics-date">Data for {analytics.date}</p>
            </>
          )}
          {!analyticsLoading && !analytics && (
            <p className="agent-loading">Analytics unavailable</p>
          )}
        </section>

        <style jsx>{`
          .agent-subtitle {
            color: var(--text-dim);
            font-family: var(--font-body);
            margin-top: -0.5rem;
          }
          .agent-loading {
            color: var(--text-dim);
            font-family: var(--font-body);
          }
          .agent-status-row {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
          }
          .agent-badge {
            font-family: var(--font-body);
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            padding: 0.35rem 0.75rem;
            border: 1px solid;
          }
          .agent-badge-live {
            color: #00ff88;
            border-color: #00ff8844;
            background: #00ff8811;
          }
          .agent-badge-pending {
            color: #ffaa00;
            border-color: #ffaa0044;
            background: #ffaa0011;
          }
          .agent-badge-x402 {
            color: var(--pink);
            border-color: rgba(247, 134, 198, 0.3);
            background: rgba(247, 134, 198, 0.08);
          }
          .agent-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }
          .agent-card h2 {
            font-family: var(--font-display);
            font-size: 1.4rem;
            color: var(--pink);
            margin: 0 0 1rem 0;
            letter-spacing: 0.03em;
          }
          .agent-card p {
            color: var(--text-dim);
            font-family: var(--font-body);
            line-height: 1.6;
          }
          .agent-detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
          }
          .agent-detail {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .agent-label {
            font-family: var(--font-body);
            font-size: 0.75rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .agent-value {
            font-family: var(--font-body);
            font-size: 1rem;
            color: #fff;
          }
          .agent-services {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .agent-service {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 0.75rem 1rem;
          }
          .agent-service-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.35rem;
          }
          .agent-service-name {
            font-family: var(--font-body);
            font-weight: 700;
            color: #fff;
          }
          .agent-service-version {
            font-family: var(--font-body);
            font-size: 0.75rem;
            color: var(--text-dim);
          }
          .agent-service-endpoint {
            font-family: var(--font-body);
            font-size: 0.8rem;
            color: var(--pink);
            word-break: break-all;
          }
          .agent-contracts {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .agent-contract {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .agent-contract-link {
            font-family: var(--font-body);
            color: var(--pink);
            text-decoration: none;
          }
          .agent-contract-link:hover {
            text-decoration: underline;
          }
          .agent-trust-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .agent-trust-list li {
            font-family: var(--font-body);
            color: var(--text-dim);
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            line-height: 1.5;
          }
          .agent-trust-list li:last-child {
            border-bottom: none;
          }
          .agent-trust-list a {
            color: var(--pink);
            text-decoration: none;
          }
          .agent-trust-list a:hover {
            text-decoration: underline;
          }
          .agent-code-block {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 1rem;
            overflow-x: auto;
          }
          .agent-code-block pre {
            margin: 0;
            font-family: var(--font-body);
            font-size: 0.8rem;
            color: #ccc;
            line-height: 1.6;
            white-space: pre;
          }
          .analytics-section {
            margin-top: 2rem;
            border-color: rgba(247, 134, 198, 0.2);
          }
          .analytics-stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
          .analytics-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(247, 134, 198, 0.06);
            border: 1px solid rgba(247, 134, 198, 0.15);
            padding: 1rem 0.75rem;
          }
          .analytics-stat-value {
            font-family: var(--font-display);
            font-size: 2rem;
            color: var(--pink);
            line-height: 1;
          }
          .analytics-stat-label {
            font-family: var(--font-body);
            font-size: 0.7rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: 0.4rem;
          }
          .analytics-breakdown {
            margin-bottom: 1.5rem;
          }
          .analytics-breakdown h3 {
            font-family: var(--font-display);
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.7);
            margin: 0 0 0.75rem 0;
            letter-spacing: 0.04em;
          }
          .analytics-bar-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .analytics-bar-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .analytics-bar-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .analytics-bar-endpoint {
            font-family: var(--font-body);
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.8);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .analytics-bar-count {
            font-family: var(--font-body);
            font-size: 0.75rem;
            color: var(--pink);
            font-weight: 700;
            flex-shrink: 0;
            margin-left: 0.5rem;
          }
          .analytics-bar-track {
            height: 4px;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 2px;
            overflow: hidden;
          }
          .analytics-bar-fill {
            height: 100%;
            background: var(--pink);
            border-radius: 2px;
            transition: width 0.6s ease;
          }
          .analytics-bar-fill-mcp {
            background: #00ff88;
          }
          .analytics-date {
            font-family: var(--font-body);
            font-size: 0.7rem;
            color: var(--text-dim);
            text-align: right;
            margin-top: 0.5rem;
          }
        `}</style>
      </div>
    </div>
  );
}
