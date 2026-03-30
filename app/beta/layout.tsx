'use client';

import { useState, useEffect } from 'react';
import { BetaProviders } from './providers';
import { BetaNav } from './BetaNav';

function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('beta-auth');
    if (stored === 'true') {
      setAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/beta/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        sessionStorage.setItem('beta-auth', 'true');
        setAuthenticated(true);
      } else {
        setError('ACCESS DENIED');
        setPassword('');
      }
    } catch {
      setError('CONNECTION FAILED');
    }
  };

  if (loading) {
    return (
      <div className="beta-gate">
        <div className="beta-gate-inner">
          <div className="beta-loading-pulse" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="beta-gate">
        <div className="beta-gate-inner">
          <div className="beta-gate-badge">CLASSIFIED</div>
          <h1 className="beta-gate-title">MEGACHAD PROTOCOL</h1>
          <p className="beta-gate-subtitle">TESTNET ACCESS REQUIRED</p>

          <form onSubmit={handleSubmit} className="beta-gate-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter access code..."
              className="beta-gate-input"
              autoFocus
            />
            <button type="submit" className="beta-gate-btn">
              AUTHENTICATE
            </button>
          </form>

          {error && <p className="beta-gate-error">{error}</p>}

          <p className="beta-gate-footer">
            Authorized beta testers only. Contact the team for access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <BetaProviders>
      <PasswordGate>
        <BetaNav />
        <main className="beta-main">{children}</main>
      </PasswordGate>
    </BetaProviders>
  );
}
