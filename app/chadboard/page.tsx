'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import * as Ably from 'ably';
import {
  ERC8004_REPUTATION_REGISTRY,
  REPUTATION_REGISTRY_ABI,
} from '@/lib/erc8004';
import { useRealtimeNFTMints } from '@/hooks/useRealtimeNFTMints';

interface ChadboardImage {
  ipfsUrl: string;
  timestamp: string;
  txHash: string;
}

interface MegaNameProfile {
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  telegram?: string;
  url?: string;
}

interface ChadboardEntry {
  address: string;
  megaName?: string;
  megaProfile?: MegaNameProfile;
  totalBurns: number;
  totalBurned: number;
  latestImage: string;
  latestTimestamp: string;
  images: ChadboardImage[];
  reputation?: { score: number | null; count: number };
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

function displayName(entry: ChadboardEntry): string {
  return entry.megaName || truncAddr(entry.address);
}

const TIER_THRESHOLDS = [
  { min: 25, name: 'Gigachad', color: '#FFD700' },
  { min: 10, name: 'Chad', color: '#FF4444' },
  { min: 3, name: 'Bonesmasher', color: '#F786C6' },
  { min: 1, name: 'Mewer', color: '#88CCFF' },
  { min: 0, name: 'Normie', color: '#999' },
];

function getTier(burns: number): { name: string; color: string } {
  for (const t of TIER_THRESHOLDS) {
    if (burns >= t.min) return { name: t.name, color: t.color };
  }
  return { name: 'Normie', color: '#999' };
}

const TEST_CID = 'bafkreia6nhohfylww3stb3vou6kynvrpdov6vrfhromuwwbmzuwptrzd3u';

function isTestImage(url: string): boolean {
  return url.includes(TEST_CID);
}

export default function ChadboardPage() {
  const [entries, setEntries] = useState<ChadboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<ChadboardEntry | null>(null);
  const [newMintNotif, setNewMintNotif] = useState(false);

  // ─── Wallet ──────────────────────────────────────────
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  const connectWallet = () => {
    if (connectors.length <= 1) {
      const c = connectors[0];
      if (c) connect({ connector: c });
      return;
    }
    setShowWalletPicker(true);
  };

  const pickConnector = (connector: typeof connectors[number]) => {
    connect({ connector });
    setShowWalletPicker(false);
  };

  // ─── Real-time NFT mints ─────────────────────────────
  const { latestMint, isConnected: wsConnected } = useRealtimeNFTMints();

  // ─── Audio ─────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (localStorage.getItem('megachad-audio-stopped') === 'true') return;

    audio.volume = 0.3;
    audio.muted = true;
    audio.play()
      .then(() => {
        setAudioPlaying(true);
        setTimeout(() => { audio.muted = false; }, 100);
      })
      .catch(() => {});
  }, []);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
      localStorage.setItem('megachad-audio-stopped', 'true');
    } else {
      audio.muted = false;
      audio.play()
        .then(() => {
          setAudioPlaying(true);
          localStorage.removeItem('megachad-audio-stopped');
        })
        .catch(() => {});
    }
  }, [audioPlaying]);

  // ─── Mobile nav ────────────────────────────────────
  const [mobileNav, setMobileNav] = useState(false);

  // ─── Fetch data ────────────────────────────────────
  const fetchChadboard = useCallback(() => {
    fetch('/api/chadboard')
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        if (data.agentId) setAgentId(data.agentId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchChadboard();
  }, [fetchChadboard]);

  // ─── Real-time mint updates ────────────────────────
  useEffect(() => {
    if (!latestMint) return;

    // Show notification
    setNewMintNotif(true);
    setTimeout(() => setNewMintNotif(false), 5000);

    // Refresh Chadboard data
    fetchChadboard();
  }, [latestMint, fetchChadboard]);

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

  // ─── Reputation state ─────────────────────────────
  const [agentId, setAgentId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(80);
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [ratingError, setRatingError] = useState<string | null>(null);

  const {
    writeContract: writeReputation,
    data: repTxHash,
    error: repError,
    reset: resetRep,
  } = useWriteContract();

  const { isSuccess: repConfirmed, isError: repFailed } =
    useWaitForTransactionReceipt({
      hash: repTxHash,
      query: { enabled: !!repTxHash },
    });

  useEffect(() => {
    if (repTxHash && ratingStatus === 'sending') {
      // tx submitted, waiting for confirmation
    }
  }, [repTxHash, ratingStatus]);

  useEffect(() => {
    if (repConfirmed && ratingStatus === 'sending') {
      setRatingStatus('done');
    }
    if (repFailed && ratingStatus === 'sending') {
      setRatingStatus('error');
      setRatingError('Transaction failed on-chain');
    }
  }, [repConfirmed, repFailed, ratingStatus]);

  useEffect(() => {
    if (repError && ratingStatus === 'sending') {
      setRatingStatus('error');
      setRatingError(
        repError.message.includes('User rejected')
          ? 'Transaction rejected.'
          : 'Failed to submit rating.'
      );
    }
  }, [repError, ratingStatus]);

  const handleRate = () => {
    if (!agentId || !isConnected) return;
    setRatingStatus('sending');
    setRatingError(null);
    resetRep();

    writeReputation({
      address: ERC8004_REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'giveFeedback',
      args: [
        BigInt(agentId),
        BigInt(ratingValue),
        0, // valueDecimals (integer)
        'starred', // tag1
        '', // tag2
        '', // endpoint
        '', // feedbackURI
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, // feedbackHash
      ],
    });
  };

  const resetRating = () => {
    setRatingStatus('idle');
    setRatingError(null);
    setRatingValue(80);
    resetRep();
  };

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
        <ul className={`nav-links ${mobileNav ? 'open' : ''}`}>
          <li><Link href="/main#about" onClick={() => setMobileNav(false)}>About</Link></li>
          <li><Link href="/main#buy" onClick={() => setMobileNav(false)}>Buy</Link></li>
          <li><Link href="/main#burn" onClick={() => setMobileNav(false)}>Burn</Link></li>
          <li><Link href="/main#roadmap" onClick={() => setMobileNav(false)}>Roadmap</Link></li>
          <li><Link href="/main#chads" onClick={() => setMobileNav(false)}>Chads</Link></li>
          <li><Link href="/chadboard" onClick={() => setMobileNav(false)} className="nav-link-active">Chadboard</Link></li>
          <li><Link href="/portal" onClick={() => setMobileNav(false)}>Portal</Link></li>
        </ul>
        <div className="nav-right">
          {isConnected ? (
            <button className="nav-wallet" onClick={() => disconnect()}>
              {truncAddr(address!)}
            </button>
          ) : (
            <button className="nav-wallet" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
          <button className="nav-burger" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ─── WALLET PICKER ───────────────────────────── */}
      {showWalletPicker && (
        <div className="wallet-overlay" onClick={() => setShowWalletPicker(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Connect Wallet</h3>
            <div className="wallet-options">
              {connectors.map((c) => (
                <button key={c.uid} className="wallet-option" onClick={() => pickConnector(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            <Link href="/main#burn" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Burn & Looksmaxx
            </Link>
          </div>
        )}

        {!loading && entries.length > 0 && !selectedWallet && (
          <div className="chads-grid" style={{ marginTop: '2.5rem' }}>
            {entries.map((entry, i) => {
              const tier = getTier(entry.totalBurns);
              return (
                <div
                  key={entry.address}
                  className="chad-card cb-clickable"
                  onClick={() => setSelectedWallet(entry)}
                >
                  <div className="chad-img">
                    {entry.totalBurns === 0 ? (
                      <div className="cb-normie-placeholder">NORMIE</div>
                    ) : isTestImage(entry.latestImage) ? (
                      <div className="cb-test-placeholder">TEST</div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={entry.latestImage} alt={`Latest by ${displayName(entry)}`} />
                    )}
                    {i === 0 && entry.totalBurns > 0 && <div className="cb-crown">MOGGER</div>}
                  </div>
                  <div className="chad-name">{entry.totalBurns > 0 ? `#${entries.filter(e => e.totalBurns > 0).indexOf(entry) + 1} LooksMaxxer` : 'Normie'}</div>
                  <div className="chad-role">{displayName(entry)}</div>
                  <div className="cb-tier-badge" style={{ color: tier.color, borderColor: tier.color }}>
                    {tier.name}
                  </div>
                  <div className="cb-card-stats">
                    <div className="cb-card-stat">
                      <span className="cb-card-stat-value">{entry.totalBurns}</span>
                      <span className="cb-card-stat-label">{entry.totalBurns === 1 ? 'Burn' : 'Burns'}</span>
                    </div>
                    <div className="cb-card-stat">
                      <span className="cb-card-stat-value">{entry.totalBurned.toLocaleString()}</span>
                      <span className="cb-card-stat-label">Burned</span>
                    </div>
                    {entry.reputation && entry.reputation.score !== null && (
                      <div className="cb-card-stat">
                        <span className="cb-card-stat-value cb-rep-score">{entry.reputation.score}</span>
                        <span className="cb-card-stat-label">Rep ({entry.reputation.count})</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/profile/${entry.address}`}
                    className="cb-profile-link-btn"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'var(--pink)', fontSize: '.7rem', letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none', marginTop: '.5rem', display: 'inline-block' }}
                  >
                    View Profile &rarr;
                  </Link>
                </div>
              );
            })}
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
                  <span className="cb-tier-badge" style={{ color: getTier(selectedWallet.totalBurns).color, borderColor: getTier(selectedWallet.totalBurns).color, marginLeft: '.75rem', fontSize: '.65rem' }}>
                    {getTier(selectedWallet.totalBurns).name}
                  </span>
                </div>
                <div className="cb-detail-address">
                  {selectedWallet.megaName ? (
                    <>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedWallet.megaName}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '.75rem', marginLeft: '.5rem' }}>
                        ({truncAddr(selectedWallet.address)})
                      </span>
                    </>
                  ) : (
                    selectedWallet.address
                  )}
                </div>
                <Link
                  href={`/profile/${selectedWallet.address}`}
                  style={{ color: 'var(--pink)', fontSize: '.75rem', letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none', marginTop: '.25rem', display: 'inline-block' }}
                >
                  Full Profile &rarr;
                </Link>
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
                {selectedWallet.reputation && selectedWallet.reputation.score !== null && (
                  <div className="cb-card-stat">
                    <span className="cb-card-stat-value cb-rep-score">{selectedWallet.reputation.score}/100</span>
                    <span className="cb-card-stat-label">Reputation ({selectedWallet.reputation.count})</span>
                  </div>
                )}
              </div>
            </div>

            {/* ─── MEGA PROFILE ─────────────────────────── */}
            {selectedWallet.megaProfile && (
              <div className="cb-profile">
                {selectedWallet.megaProfile.description && (
                  <div className="cb-profile-bio">
                    {selectedWallet.megaProfile.description}
                  </div>
                )}
                <div className="cb-profile-links">
                  {selectedWallet.megaProfile.twitter && (
                    <a
                      href={`https://x.com/${selectedWallet.megaProfile.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cb-profile-link"
                    >
                      X: {selectedWallet.megaProfile.twitter}
                    </a>
                  )}
                  {selectedWallet.megaProfile.github && (
                    <a
                      href={`https://github.com/${selectedWallet.megaProfile.github.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cb-profile-link"
                    >
                      GitHub: {selectedWallet.megaProfile.github}
                    </a>
                  )}
                  {selectedWallet.megaProfile.telegram && (
                    <a
                      href={`https://t.me/${selectedWallet.megaProfile.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cb-profile-link"
                    >
                      Telegram: {selectedWallet.megaProfile.telegram}
                    </a>
                  )}
                  {selectedWallet.megaProfile.url && (
                    <a
                      href={selectedWallet.megaProfile.url.startsWith('http') ? selectedWallet.megaProfile.url : `https://${selectedWallet.megaProfile.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cb-profile-link"
                    >
                      {selectedWallet.megaProfile.url}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ─── REPUTATION RATING ──────────────────────── */}
            {agentId && isConnected && address?.toLowerCase() !== selectedWallet.address.toLowerCase() && (
              <div className="cb-rep-section">
                <div className="cb-rep-header">Rate this LooksMaxxer</div>
                {ratingStatus === 'done' ? (
                  <div className="cb-rep-done">
                    <span className="cb-rep-done-text">Rating submitted on-chain!</span>
                    <button className="btn btn-outline cb-rep-btn-sm" onClick={resetRating}>Rate Again</button>
                  </div>
                ) : (
                  <div className="cb-rep-form">
                    <div className="cb-rep-slider-row">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={ratingValue}
                        onChange={(e) => setRatingValue(Number(e.target.value))}
                        className="cb-rep-slider"
                        disabled={ratingStatus === 'sending'}
                      />
                      <span className="cb-rep-slider-value">{ratingValue}/100</span>
                    </div>
                    <button
                      className="btn btn-primary cb-rep-btn-sm"
                      onClick={handleRate}
                      disabled={ratingStatus === 'sending'}
                    >
                      {ratingStatus === 'sending' ? 'Submitting...' : 'Submit Rating'}
                    </button>
                    {ratingError && <div className="cb-rep-error">{ratingError}</div>}
                    <div className="cb-rep-hint">
                      Recorded on-chain via ERC-8004 Reputation Registry
                    </div>
                  </div>
                )}
              </div>
            )}
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

      {/* ─── AUDIO + LIVE CONTROLS ───────────────────── */}
      <div className="realtime-controls">
        <button className="audio-toggle" onClick={toggleAudio} title={audioPlaying ? 'Mute' : 'Play Music'}>
          {audioPlaying ? '♫' : '♪'}
        </button>
        {wsConnected && (
          <div className="realtime-status" title="Connected to MegaETH WebSocket">
            <span className="realtime-dot" />
            <span className="realtime-text">LIVE</span>
          </div>
        )}
      </div>

      {/* ─── NEW MINT NOTIFICATION ───────────────────── */}
      {newMintNotif && (
        <div className="new-mint-notif">
          <span className="new-mint-icon">🔥</span>
          <div>
            <div className="new-mint-title">New Looksmaxxer!</div>
            <div className="new-mint-subtitle">Someone just minted an NFT</div>
          </div>
        </div>
      )}

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
              <li><Link href="/main#about">About</Link></li>
              <li><Link href="/main#burn">Burn</Link></li>
              <li><Link href="/main#roadmap">Roadmap</Link></li>
              <li><Link href="/main#chads">Chads</Link></li>
              <li><Link href="/chadboard">Chadboard</Link></li>
              <li><Link href="/portal">Portal</Link></li>
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
