'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import * as Ably from 'ably';

interface ChadboardImage {
  ipfsUrl: string;
  timestamp: string;
  txHash: string;
}

interface ChadboardEntry {
  address: string;
  totalBurns: number;
  totalBurned: number;
  latestImage: string;
  latestTimestamp: string;
  images: ChadboardImage[];
}

interface ChatMessage {
  id: string;
  address: string;
  displayName: string;
  text: string;
  timestamp: number;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const TEST_CID = 'bafkreia6nhohfylww3stb3vou6kynvrpdov6vrfhromuwwbmzuwptrzd3u';

function isTestImage(url: string): boolean {
  return url.includes(TEST_CID);
}

export default function ChadboardPage() {
  const [entries, setEntries] = useState<ChadboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<ChadboardEntry | null>(null);

  // ─── Wallet ──────────────────────────────────────────
  const { address, isConnected } = useAccount();

  // ─── Audio ─────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = true;
    audio.volume = 0.3;

    audio.play().then(() => {
      setAudioPlaying(true);
      setTimeout(() => { audio.muted = false; }, 100);
    }).catch(() => {
      const playOnInteraction = () => {
        audio.muted = false;
        audio.play().then(() => setAudioPlaying(true)).catch(() => {});
        window.removeEventListener('click', playOnInteraction);
        window.removeEventListener('keydown', playOnInteraction);
      };
      window.addEventListener('click', playOnInteraction, { once: true });
      window.addEventListener('keydown', playOnInteraction, { once: true });
    });
  }, []);

  const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {});
    }
  }, [audioPlaying]);

  // ─── Mobile nav ────────────────────────────────────
  const [mobileNav, setMobileNav] = useState(false);

  // ─── Fetch data ────────────────────────────────────
  useEffect(() => {
    fetch('/api/chadboard')
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ─── Chat State ────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [hasBurns, setHasBurns] = useState(false);
  const [burnCheckDone, setBurnCheckDone] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  // ─── Name popup state ──────────────────────────────
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const nameCheckedRef = useRef(false);

  // Check if user has burns when wallet connects
  useEffect(() => {
    if (!isConnected || !address) {
      setHasBurns(false);
      setBurnCheckDone(false);
      nameCheckedRef.current = false;
      return;
    }

    fetch('/api/chat/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    }).then((r) => {
      setHasBurns(r.ok);
      setBurnCheckDone(true);
    }).catch(() => {
      setBurnCheckDone(true);
    });
  }, [isConnected, address]);

  // Fetch display name when wallet connects
  useEffect(() => {
    if (!isConnected || !address || nameCheckedRef.current) return;
    nameCheckedRef.current = true;

    fetch(`/api/chat/name?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        setCurrentName(data.name || null);
      })
      .catch(() => {});
  }, [isConnected, address]);

  // Connect to Ably when chat opens
  useEffect(() => {
    if (!chatOpen || !hasBurns || !address) return;
    if (ablyClientRef.current) return;

    const client = new Ably.Realtime({
      authCallback: async (_, callback) => {
        try {
          const res = await fetch('/api/chat/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });
          const tokenRequest = await res.json();
          callback(null, tokenRequest);
        } catch (err) {
          const errInfo = err instanceof Error
            ? { message: err.message, code: 40000, statusCode: 400 } as Ably.ErrorInfo
            : null;
          callback(errInfo, null);
        }
      },
    });

    ablyClientRef.current = client;
    const channel = client.channels.get('chadchat');
    channelRef.current = channel;

    channel.subscribe('message', (msg: Ably.Message) => {
      const data = msg.data as ChatMessage;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    // Load history
    fetch('/api/chat/messages?limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) {
          setChatMessages(data.messages);
        }
      })
      .catch(() => {});

    return () => {
      channel.unsubscribe();
      client.close();
      ablyClientRef.current = null;
      channelRef.current = null;
    };
  }, [chatOpen, hasBurns, address]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleChatToggle = () => {
    if (!chatOpen && !currentName && nameCheckedRef.current) {
      setShowNamePopup(true);
      return;
    }
    setChatOpen(!chatOpen);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatSending || !address) return;

    setChatSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, text: chatInput.trim() }),
      });
      if (res.ok) {
        setChatInput('');
      }
    } catch {
      // ignore
    }
    setChatSending(false);
  };

  const handleNameSave = async () => {
    if (!address) return;
    setNameError('');
    setNameSaving(true);

    try {
      const res = await fetch('/api/chat/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          name: isAnon ? undefined : (nameInput.trim() || undefined),
          isAnon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error || 'Failed');
        setNameSaving(false);
        return;
      }
      setCurrentName(data.name || null);
      setShowNamePopup(false);
      setChatOpen(true);
    } catch {
      setNameError('Failed to save name');
    }
    setNameSaving(false);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <audio ref={audioRef} loop preload="auto" autoPlay muted>
        <source src="/audio/megachad-theme.mp3" type="audio/mpeg" />
      </audio>

      {/* ─── NAV ─────────────────────────────────────── */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <Image
            src="/images/megachad-logo.png"
            alt="$MEGACHAD"
            width={180}
            height={50}
            priority
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        </Link>
        <ul className={`nav-links ${mobileNav ? 'open' : ''}`}>
          <li><Link href="/#about" onClick={() => setMobileNav(false)}>About</Link></li>
          <li><Link href="/#burn" onClick={() => setMobileNav(false)}>Burn</Link></li>
          <li><Link href="/#roadmap" onClick={() => setMobileNav(false)}>Roadmap</Link></li>
          <li><Link href="/#chads" onClick={() => setMobileNav(false)}>Chads</Link></li>
          <li className="nav-divider">|</li>
          <li><Link href="/chadboard" onClick={() => setMobileNav(false)} className="nav-link-active">Chadboard</Link></li>
        </ul>
        <div className="nav-right">
          <button className="audio-toggle" onClick={toggleAudio} title={audioPlaying ? 'Mute' : 'Play Music'}>
            {audioPlaying ? '♫' : '♪'}
          </button>
          <button className="nav-burger" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ─── CHADBOARD CONTENT ────────────────────────── */}
      <section className="section" style={{ paddingTop: '8rem' }}>
        <div className="section-label">Leaderboard</div>
        <h2 className="section-heading">Chadboard</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', marginTop: '.5rem', maxWidth: 500 }}>
          The most dedicated looksmaxxers ranked by total burns. Click a wallet to see all their creations.
        </p>

        {loading && (
          <div className="cb-loading">Loading chadboard...</div>
        )}

        {!loading && entries.length === 0 && (
          <div className="burn-card" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
              No burns yet. Be the first to claim the #1 LooksMaxxer spot.
            </div>
            <Link href="/#burn" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Burn & Looksmaxx
            </Link>
          </div>
        )}

        {!loading && entries.length > 0 && !selectedWallet && (
          <div className="chads-grid" style={{ marginTop: '2.5rem' }}>
            {entries.map((entry, i) => (
              <div
                key={entry.address}
                className="chad-card cb-clickable"
                onClick={() => setSelectedWallet(entry)}
              >
                <div className="chad-img">
                  {isTestImage(entry.latestImage) ? (
                    <div className="cb-test-placeholder">TEST</div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={entry.latestImage} alt={`Latest by ${truncAddr(entry.address)}`} />
                  )}
                  {i === 0 && <div className="cb-crown">MOGGER</div>}
                </div>
                <div className="chad-name">#{i + 1} LooksMaxxer</div>
                <div className="chad-role">{truncAddr(entry.address)}</div>
                <div className="cb-card-stats">
                  <div className="cb-card-stat">
                    <span className="cb-card-stat-value">{entry.totalBurns}</span>
                    <span className="cb-card-stat-label">{entry.totalBurns === 1 ? 'Burn' : 'Burns'}</span>
                  </div>
                  <div className="cb-card-stat">
                    <span className="cb-card-stat-value">{entry.totalBurned.toLocaleString()}</span>
                    <span className="cb-card-stat-label">Burned</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── WALLET DETAIL VIEW ──────────────────────── */}
        {selectedWallet && (
          <div className="cb-detail">
            <button className="cb-back" onClick={() => setSelectedWallet(null)}>
              &larr; Back to Chadboard
            </button>
            <div className="cb-detail-header">
              <div>
                <div className="cb-detail-rank">
                  #{entries.indexOf(selectedWallet) + 1} LooksMaxxer
                </div>
                <div className="cb-detail-address">{selectedWallet.address}</div>
              </div>
              <div className="cb-detail-stats">
                <div className="cb-card-stat">
                  <span className="cb-card-stat-value">{selectedWallet.totalBurns}</span>
                  <span className="cb-card-stat-label">{selectedWallet.totalBurns === 1 ? 'Burn' : 'Burns'}</span>
                </div>
                <div className="cb-card-stat">
                  <span className="cb-card-stat-value">{selectedWallet.totalBurned.toLocaleString()}</span>
                  <span className="cb-card-stat-label">Tokens Burned</span>
                </div>
              </div>
            </div>
            <div className="cb-detail-grid">
              {selectedWallet.images.map((img) => (
                <div key={img.txHash} className="cb-detail-item">
                  {isTestImage(img.ipfsUrl) ? (
                    <div className="cb-test-placeholder cb-detail-image">TEST</div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={img.ipfsUrl} alt="Looksmaxxed" className="cb-detail-image" />
                  )}
                  <div className="cb-detail-meta">
                    <div className="cb-detail-date">
                      {new Date(img.timestamp).toLocaleDateString()}
                    </div>
                    <a
                      href={img.ipfsUrl}
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
          </div>
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
            <div className="footer-tagline">Launch Feb 9 &mdash; MegaETH</div>
          </div>
          <div className="footer-right">
            <ul className="footer-links">
              <li><Link href="/#about">About</Link></li>
              <li><Link href="/#burn">Burn</Link></li>
              <li><Link href="/#roadmap">Roadmap</Link></li>
              <li><Link href="/#chads">Chads</Link></li>
              <li className="footer-divider">|</li>
              <li><Link href="/chadboard">Chadboard</Link></li>
            </ul>
            <div className="footer-social">
              <a
                href="https://x.com/megachadxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label="X / Twitter"
              >
                <Image
                  src="/images/x-logo.svg"
                  alt="X"
                  width={24}
                  height={24}
                />
              </a>
              <a
                href="https://t.me/megachads"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link footer-social-link--telegram"
                aria-label="Telegram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── CHADCHAT TOGGLE ──────────────────────────── */}
      {isConnected && burnCheckDone && hasBurns && (
        <button
          className={`chadchat-toggle ${chatOpen ? 'chadchat-toggle--active' : ''}`}
          onClick={handleChatToggle}
          title="ChadChat"
        >
          {chatOpen ? '✕' : '💬'}
        </button>
      )}

      {/* ─── CHADCHAT PANEL ──────────────────────────── */}
      {chatOpen && (
        <div className="chadchat-panel">
          <div className="chadchat-header">
            <span className="chadchat-title">ChadChat</span>
            <button className="chadchat-name-btn" onClick={() => setShowNamePopup(true)} title="Change name">
              {currentName || (address ? truncAddr(address) : '?')}
            </button>
          </div>
          <div className="chadchat-messages" ref={chatMessagesRef}>
            {chatMessages.length === 0 && (
              <div className="chadchat-empty">No messages yet. Be the first Chad to speak.</div>
            )}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`chadchat-msg ${msg.address === address?.toLowerCase() ? 'chadchat-msg--own' : ''}`}
              >
                <div className="chadchat-msg-header">
                  <span className="chadchat-msg-name">{msg.displayName}</span>
                  <span className="chadchat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="chadchat-msg-text">{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="chadchat-input-bar">
            <input
              className="chadchat-input"
              type="text"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              maxLength={280}
              disabled={chatSending}
            />
            <button
              className="chadchat-send"
              onClick={handleSendMessage}
              disabled={chatSending || !chatInput.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ─── NAME POPUP ──────────────────────────────── */}
      {showNamePopup && (
        <div className="chadchat-name-overlay" onClick={() => setShowNamePopup(false)}>
          <div className="chadchat-name-popup" onClick={(e) => e.stopPropagation()}>
            <h3 className="chadchat-name-popup-title">Set Chat Name</h3>
            <p className="chadchat-name-popup-desc">
              Choose how you appear in ChadChat.
            </p>

            <div className="chadchat-name-option">
              <label className="chadchat-name-label">
                <input
                  type="radio"
                  name="nameChoice"
                  checked={!isAnon}
                  onChange={() => setIsAnon(false)}
                />
                Custom name
              </label>
              {!isAnon && (
                <input
                  className="chadchat-name-input"
                  type="text"
                  placeholder="2-20 chars, letters/numbers/spaces"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={20}
                />
              )}
            </div>

            <div className="chadchat-name-option">
              <label className="chadchat-name-label">
                <input
                  type="radio"
                  name="nameChoice"
                  checked={isAnon}
                  onChange={() => setIsAnon(true)}
                />
                Go Anon
              </label>
            </div>

            <p className="chadchat-name-popup-hint">
              Leave custom name empty to use your wallet address ({address ? truncAddr(address) : ''}).
            </p>

            {nameError && <div className="chadchat-name-error">{nameError}</div>}

            <div className="chadchat-name-actions">
              <button className="btn btn-outline chadchat-name-cancel" onClick={() => setShowNamePopup(false)}>
                Cancel
              </button>
              <button className="btn btn-primary chadchat-name-save" onClick={handleNameSave} disabled={nameSaving}>
                {nameSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
