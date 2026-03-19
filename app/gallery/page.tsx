'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BurnRecord {
  txHash: string;
  burner: string;
  prompt: string;
  cid: string;
  ipfsUrl: string;
  timestamp: string;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GalleryPage() {
  const [burns, setBurns] = useState<BurnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gallery?limit=30')
      .then((r) => r.json())
      .then((data) => setBurns(data.burns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <Link href="/main" className="nav-logo" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--pink)', textShadow: 'var(--pink-glow)', textDecoration: 'none' }}>
          $MEGACHAD
        </Link>
        <ul className="nav-links">
          <li><Link href="/main">Burn</Link></li>
          <li><Link href="/chadboard">Chadboard</Link></li>
          <li><Link href="/gallery" className="nav-link-active">Gallery</Link></li>
          <li><Link href="/portal">Portal</Link></li>
        </ul>
      </nav>

      <section className="section" style={{ paddingTop: '8rem' }}>
        <div className="section-label">Community</div>
        <h2 className="section-heading">Burn Gallery</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', marginTop: '.5rem' }}>
          Every burn is permanent. Every image is immortal on IPFS.
        </p>

        {loading && (
          <div style={{ color: 'var(--pink)', marginTop: '2rem', fontSize: '.8rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Loading burns...
          </div>
        )}

        {!loading && burns.length === 0 && (
          <div className="burn-card" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
              No burns yet. Be the first to burn tokens and create art.
            </div>
            <Link href="/main#burn" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Burn & Create
            </Link>
          </div>
        )}

        {!loading && burns.length > 0 && (
          <div className="gallery-grid">
            {burns.map((burn) => (
              <div key={burn.txHash} className="gallery-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={burn.ipfsUrl} alt={burn.prompt} className="gallery-image" />
                <div className="gallery-meta">
                  <div className="gallery-prompt">{burn.prompt}</div>
                  <Link href={`/profile/${burn.burner}`} className="gallery-burner" style={{ color: 'var(--pink)', textDecoration: 'none' }}>{truncAddr(burn.burner)}</Link>
                  <div className="gallery-time">
                    {new Date(burn.timestamp).toLocaleDateString()}
                  </div>
                  <a
                    href={burn.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gallery-ipfs-link"
                  >
                    IPFS
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
