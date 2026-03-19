'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';

interface BurnRecord {
  txHash: string;
  timestamp: string;
  ipfsUrl?: string;
}

interface IdentityData {
  address: string;
  displayName: string;
  megaName?: {
    name?: string;
    avatar?: string;
    description?: string;
    twitter?: string;
    github?: string;
    telegram?: string;
    url?: string;
  };
  balances: {
    eth: string;
    megachad: string;
  };
  burns: {
    total: number;
    totalBurned: string;
    history: BurnRecord[];
    rank?: number;
  };
  nfts: {
    count: number;
  };
  reputation: {
    score: number | null;
    count: number;
  };
  referral: {
    isAgent: boolean;
    referralCount: number;
    totalEarnings: string;
    referralCode?: string;
  };
  tier: {
    level: number;
    name: string;
  };
}

const TEST_CID = 'bafkreia6nhohfylww3stb3vou6kynvrpdov6vrfhromuwwbmzuwptrzd3u';
function isTestImage(url: string): boolean {
  return url.includes(TEST_CID);
}

const TIER_COLORS: Record<string, string> = {
  'Eternal Chad': '#FFD700',
  'Gigachad': '#FF4444',
  'Mogger': '#F786C6',
  'Mewer': '#88CCFF',
  'Normie': '#999',
  'Unburned': '#555',
};

export default function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address: paramAddress } = use(params);
  const { address: connectedAddress } = useAccount();

  const [identity, setIdentity] = useState<IdentityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'burns' | 'stats'>('burns');

  useEffect(() => {
    if (!paramAddress) return;

    fetch(`/api/identity/${paramAddress}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to resolve identity');
        return r.json();
      })
      .then(data => {
        setIdentity(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [paramAddress]);

  const isOwnProfile = connectedAddress?.toLowerCase() === identity?.address?.toLowerCase();
  const tierColor = TIER_COLORS[identity?.tier?.name || 'Unburned'] || '#555';

  return (
    <>
      {/* ─── NAV ─────────────────────────────────────── */}
      <nav className="nav">
        <Link href="/main" className="nav-logo">
          <Image
            src="/images/megachad-logo.png"
            alt="$MEGACHAD"
            width={180}
            height={50}
            priority
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        </Link>
        <ul className="nav-links">
          <li><Link href="/main">Burn</Link></li>
          <li><Link href="/chadboard">Chadboard</Link></li>
          <li className="nav-divider">|</li>
          <li><Link href="/portal">Portal</Link></li>
        </ul>
      </nav>

      <section className="section" style={{ paddingTop: '8rem' }}>
        {loading && <div className="cb-loading">Resolving identity...</div>}

        {error && (
          <div className="burn-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ color: '#ff6b6b', fontSize: '.9rem' }}>Failed to load profile: {error}</div>
            <Link href="/chadboard" className="btn btn-outline" style={{ marginTop: '1rem' }}>
              View Chadboard
            </Link>
          </div>
        )}

        {identity && !loading && (
          <>
            {/* ─── PROFILE HEADER ────────────────────────── */}
            <div style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              maxWidth: 800,
            }}>
              {/* Avatar / Latest Looksmaxx */}
              <div style={{
                width: 140,
                height: 140,
                borderRadius: 12,
                overflow: 'hidden',
                border: `2px solid ${tierColor}`,
                flexShrink: 0,
                background: 'rgba(255,255,255,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {identity.burns.history.length > 0 && identity.burns.history[0].ipfsUrl && !isTestImage(identity.burns.history[0].ipfsUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={identity.burns.history[0].ipfsUrl}
                    alt="Latest looksmaxx"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '2rem', fontFamily: "'Bebas Neue'" }}>
                    {identity.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name & Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: '2rem',
                  color: '#fff',
                  margin: 0,
                  lineHeight: 1.1,
                }}>
                  {identity.displayName}
                </h2>

                {identity.megaName?.name && (
                  <div style={{ color: 'var(--primary)', fontSize: '.85rem', marginTop: '.25rem' }}>
                    {identity.megaName.name}
                  </div>
                )}

                <div style={{
                  color: 'var(--text-dim)',
                  fontSize: '.75rem',
                  fontFamily: "'Roboto Mono'",
                  marginTop: '.25rem',
                  wordBreak: 'break-all',
                }}>
                  {identity.address}
                </div>

                {/* Tier Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  marginTop: '.75rem',
                  padding: '4px 12px',
                  borderRadius: 6,
                  background: `${tierColor}15`,
                  border: `1px solid ${tierColor}30`,
                }}>
                  <span style={{ color: tierColor, fontSize: '.8rem', fontWeight: 600 }}>
                    {identity.tier.name}
                  </span>
                  {identity.burns.rank && (
                    <span style={{ color: 'var(--text-dim)', fontSize: '.7rem' }}>
                      Rank #{identity.burns.rank}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {identity.megaName?.description && (
                  <p style={{ color: '#ccc', fontSize: '.85rem', marginTop: '.75rem', lineHeight: 1.5 }}>
                    {identity.megaName.description}
                  </p>
                )}

                {/* Social Links */}
                <div style={{ display: 'flex', gap: '.75rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
                  {identity.megaName?.twitter && (
                    <a
                      href={`https://x.com/${identity.megaName.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: '.8rem' }}
                    >
                      X: {identity.megaName.twitter}
                    </a>
                  )}
                  {identity.megaName?.telegram && (
                    <a
                      href={`https://t.me/${identity.megaName.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: '.8rem' }}
                    >
                      TG: {identity.megaName.telegram}
                    </a>
                  )}
                  {identity.megaName?.github && (
                    <a
                      href={`https://github.com/${identity.megaName.github.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: '.8rem' }}
                    >
                      GH: {identity.megaName.github}
                    </a>
                  )}
                  {identity.megaName?.url && (
                    <a
                      href={identity.megaName.url.startsWith('http') ? identity.megaName.url : `https://${identity.megaName.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: '.8rem' }}
                    >
                      {identity.megaName.url}
                    </a>
                  )}
                  <a
                    href={`https://megaexplorer.xyz/address/${identity.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-dim)', fontSize: '.8rem' }}
                  >
                    Explorer
                  </a>
                </div>

                {isOwnProfile && (
                  <div style={{ marginTop: '.75rem' }}>
                    <Link href="/main#burn" className="btn btn-primary" style={{ fontSize: '.8rem', padding: '8px 16px' }}>
                      Burn & Looksmaxx
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ─── STATS GRID ────────────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              marginTop: '2.5rem',
              maxWidth: 800,
            }}>
              <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{identity.burns.total}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Burns</div>
              </div>
              <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{Number(identity.burns.totalBurned).toLocaleString()}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Tokens Burned</div>
              </div>
              <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{Number(identity.balances.megachad).toLocaleString()}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>$MEGACHAD</div>
              </div>
              <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{Number(identity.balances.eth).toFixed(4)}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>ETH</div>
              </div>
              {identity.reputation.score !== null && (
                <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{identity.reputation.score}/100</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Reputation ({identity.reputation.count})</div>
                </div>
              )}
              {identity.referral.isAgent && (
                <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{identity.referral.referralCount}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Referrals</div>
                </div>
              )}
            </div>

            {/* ─── AGENT / REFERRAL INFO ──────────────────── */}
            {identity.referral.isAgent && (
              <div className="burn-card" style={{ padding: '1.25rem', marginTop: '1.5rem', maxWidth: 800 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                  <span style={{ fontSize: '.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(100,200,100,0.1)', color: '#8f8', textTransform: 'uppercase', fontWeight: 600 }}>Registered Agent</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Referrals</div>
                    <div style={{ color: '#fff', fontSize: '1rem' }}>{identity.referral.referralCount}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Earnings</div>
                    <div style={{ color: '#fff', fontSize: '1rem' }}>{Number(identity.referral.totalEarnings).toLocaleString()}</div>
                  </div>
                  {identity.referral.referralCode && (
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Referral Code</div>
                      <div style={{ color: 'var(--primary)', fontSize: '.85rem', fontFamily: "'Roboto Mono'" }}>{identity.referral.referralCode}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── SECTION TABS ──────────────────────────── */}
            <div style={{
              display: 'flex',
              gap: '0',
              marginTop: '2.5rem',
              borderBottom: '1px solid rgba(247,134,198,0.15)',
              maxWidth: 800,
            }}>
              {(['burns', 'stats'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSection(tab)}
                  style={{
                    padding: '10px 24px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeSection === tab ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeSection === tab ? 'var(--primary)' : 'var(--text-dim)',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.1rem',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {tab === 'burns' ? `Looksmaxxes (${identity.burns.total})` : 'On-Chain'}
                </button>
              ))}
            </div>

            {/* ─── BURN GALLERY ───────────────────────────── */}
            {activeSection === 'burns' && (
              <div style={{ marginTop: '1.5rem', maxWidth: 800 }}>
                {identity.burns.history.length === 0 ? (
                  <div className="burn-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
                      No looksmaxxes yet.
                      {isOwnProfile && ' Burn $MEGACHAD to create your first!'}
                    </div>
                    {isOwnProfile && (
                      <Link href="/main#burn" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Burn & Looksmaxx
                      </Link>
                    )}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '1rem',
                  }}>
                    {identity.burns.history.map(burn => (
                      <div key={burn.txHash} className="burn-card" style={{ overflow: 'hidden' }}>
                        {burn.ipfsUrl && !isTestImage(burn.ipfsUrl) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={burn.ipfsUrl}
                            alt="Looksmaxxed"
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            aspectRatio: '1',
                            background: 'rgba(247,134,198,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-dim)',
                            fontSize: '.8rem',
                          }}>
                            {burn.ipfsUrl && isTestImage(burn.ipfsUrl) ? 'TEST' : 'No Image'}
                          </div>
                        )}
                        <div style={{ padding: '.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {burn.ipfsUrl && (
                              <a
                                href={burn.ipfsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', fontSize: '.7rem' }}
                              >
                                IPFS
                              </a>
                            )}
                            <a
                              href={`https://megaexplorer.xyz/tx/${burn.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--text-dim)', fontSize: '.7rem' }}
                            >
                              TX
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── ON-CHAIN STATS ─────────────────────────── */}
            {activeSection === 'stats' && (
              <div style={{ marginTop: '1.5rem', maxWidth: 800 }}>
                <div className="burn-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.1rem', color: '#fff', margin: '0 0 1rem' }}>Identity Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Address</div>
                      <div style={{ color: '#fff', fontSize: '.8rem', fontFamily: "'Roboto Mono'", wordBreak: 'break-all' }}>{identity.address}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Tier</div>
                      <div style={{ color: tierColor, fontSize: '.8rem', fontWeight: 600 }}>{identity.tier.name} (Level {identity.tier.level})</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Tier Progress</div>
                      <div style={{ color: '#fff', fontSize: '.8rem' }}>
                        {identity.tier.level < 5
                          ? `${identity.burns.total} burns → next tier at ${[0, 1, 5, 20, 50, 100][identity.tier.level + 1]} burns`
                          : 'Max tier reached'}
                      </div>
                    </div>
                    {identity.megaName?.name && (
                      <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>MegaName</div>
                        <div style={{ color: 'var(--primary)', fontSize: '.8rem' }}>{identity.megaName.name}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Agent Status</div>
                      <div style={{ color: identity.referral.isAgent ? '#8f8' : 'var(--text-dim)', fontSize: '.8rem' }}>
                        {identity.referral.isAgent ? 'Registered Agent' : 'Not registered'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Profile URL</div>
                      <div style={{ color: 'var(--primary)', fontSize: '.8rem', fontFamily: "'Roboto Mono'" }}>
                        megachad.xyz/profile/{identity.address.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ─── FOOTER ──────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Image
              src="/images/megachad-footer-logo.png"
              alt="$MEGACHAD"
              width={194}
              height={60}
              style={{ objectFit: 'contain', height: 'auto' }}
            />
            <div className="footer-tagline">MegaChad Identity Layer</div>
          </div>
        </div>
      </footer>
    </>
  );
}
