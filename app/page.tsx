'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import {
  MEGACHAD_ADDRESS,
  MEGACHAD_ABI,
  BURN_AMOUNT,
  BURN_AMOUNT_DISPLAY,
} from '@/lib/contracts';

type BurnStatus =
  | 'idle'
  | 'burning'
  | 'confirming'
  | 'generating'
  | 'pinning'
  | 'done'
  | 'error';

const STATUS_LABELS: Record<BurnStatus, string> = {
  idle: '',
  burning: 'Signing burn transaction...',
  confirming: 'Waiting for on-chain confirmation...',
  generating: 'Generating your Mega Chad...',
  pinning: 'Pinning to IPFS...',
  done: 'Your Mega Chad is immortalized.',
  error: 'Something went wrong.',
};

const PROGRESS_STEPS = ['burning', 'confirming', 'generating', 'pinning', 'done'] as const;

function stepIndex(status: BurnStatus): number {
  const idx = PROGRESS_STEPS.indexOf(status as typeof PROGRESS_STEPS[number]);
  return idx === -1 ? -1 : idx;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatBalance(raw: bigint | undefined): string {
  if (raw === undefined) return '—';
  const whole = raw / 10n ** 18n;
  return Number(whole).toLocaleString();
}

// ── Carousel slides ──────────────────────────────────
const CAROUSEL_SLIDES = [
  { src: '/images/carousel-banner.jpg', alt: 'MegaChad Banner' },
  { src: '/images/carousel-slide2.png', alt: 'MegaChad Slide' },
];

// ── Notable Chads data ───────────────────────────────
const CHADS = [
  { name: 'Clavicular', role: 'Chief Bone-Smasher', img: '/images/chad-clavicular.jpg' },
  { name: 'Sam Sulek', role: 'Head of Cardio', img: '/images/chad-samsulek.jpg' },
  { name: 'Andrew Tate', role: 'Enemy of the Matrix', img: '/images/chad-tate.jpg' },
];

// ═════════════════════════════════════════════════════
export default function Home() {
  // ─── Wallet ────────────────────────────────────────
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [showWalletPicker, setShowWalletPicker] = useState(false);

  const connectWallet = () => {
    // If only one connector, use it directly
    if (connectors.length <= 1) {
      const c = connectors[0];
      if (c) connect({ connector: c });
      return;
    }
    // Show picker for multiple wallets
    setShowWalletPicker(true);
  };

  const pickConnector = (connector: typeof connectors[number]) => {
    connect({ connector });
    setShowWalletPicker(false);
  };

  // ─── Contract reads ────────────────────────────────
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: MEGACHAD_ADDRESS,
    abi: MEGACHAD_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ─── Burn flow ─────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<BurnStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imageUrl: string;
    ipfsUrl: string;
    cid: string;
  } | null>(null);

  const {
    writeContract,
    data: burnTxHash,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isSuccess: burnConfirmed, isError: burnFailed } =
    useWaitForTransactionReceipt({
      hash: burnTxHash,
      query: { enabled: !!burnTxHash },
    });

  useEffect(() => {
    if (writeError && status === 'burning') {
      setStatus('error');
      setError(writeError.message.includes('User rejected')
        ? 'Transaction rejected.'
        : writeError.message.slice(0, 120));
    }
  }, [writeError, status]);

  useEffect(() => {
    if (burnConfirmed && burnTxHash && status === 'confirming') {
      generateImage(burnTxHash);
    }
    if (burnFailed && status === 'confirming') {
      setStatus('error');
      setError('Burn transaction failed on-chain.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burnConfirmed, burnFailed, burnTxHash, status]);

  useEffect(() => {
    if (burnTxHash && status === 'burning') {
      setStatus('confirming');
    }
  }, [burnTxHash, status]);

  const handleBurn = () => {
    if (!prompt.trim() || !isConnected) return;
    setStatus('burning');
    setError(null);
    setResult(null);
    resetWrite();

    writeContract({
      address: MEGACHAD_ADDRESS,
      abi: MEGACHAD_ABI,
      functionName: 'burnToCreate',
      args: [BURN_AMOUNT],
    });
  };

  async function generateImage(txHash: string) {
    setStatus('generating');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          prompt: prompt.trim(),
          burnerAddress: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setStatus('done');
      setResult({
        imageUrl: data.imageUrl || data.ipfsUrl,
        ipfsUrl: data.ipfsUrl,
        cid: data.ipfsCid,
      });
      refetchBalance();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
  }

  const resetBurn = () => {
    setStatus('idle');
    setError(null);
    setResult(null);
    setPrompt('');
    resetWrite();
  };

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'error';
  const hasEnough = balance !== undefined && balance >= BURN_AMOUNT;

  // ─── Carousel ──────────────────────────────────────
  const [slide, setSlide] = useState(0);
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    slideTimer.current = setInterval(() => {
      setSlide((s) => (s + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => {
      if (slideTimer.current) clearInterval(slideTimer.current);
    };
  }, []);

  const prevSlide = () => setSlide((s) => (s - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  const nextSlide = () => setSlide((s) => (s + 1) % CAROUSEL_SLIDES.length);

  // ─── Audio ─────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Aggressive autoplay: start muted, then unmute (bypasses browser restrictions)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Start muted to bypass autoplay restrictions
    audio.muted = true;
    audio.volume = 0.3;

    // Play muted audio immediately
    audio.play().then(() => {
      setAudioPlaying(true);
      // Unmute after 100ms
      setTimeout(() => {
        audio.muted = false;
      }, 100);
    }).catch(() => {
      // If even muted autoplay fails, try on first interaction
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

  // ═══ RENDER ════════════════════════════════════════
  return (
    <>
      {/* Audio element */}
      <audio ref={audioRef} loop preload="auto" autoPlay muted>
        <source src="/audio/megachad-theme.mp3" type="audio/mpeg" />
      </audio>

      {/* ─── NAV ─────────────────────────────────────── */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <Image
            src="/images/megachad-logo.png"
            alt="$MEGACHAD"
            width={180}
            height={50}
            priority
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        </a>
        <ul className={`nav-links ${mobileNav ? 'open' : ''}`}>
          <li><a href="#about" onClick={() => setMobileNav(false)}>About</a></li>
          <li><a href="#burn" onClick={() => setMobileNav(false)}>Burn</a></li>
          <li><a href="#roadmap" onClick={() => setMobileNav(false)}>Roadmap</a></li>
          <li><a href="#chads" onClick={() => setMobileNav(false)}>Chads</a></li>
        </ul>
        <div className="nav-right">
          <button className="audio-toggle" onClick={toggleAudio} title={audioPlaying ? 'Mute' : 'Play Music'}>
            {audioPlaying ? '♫' : '♪'}
          </button>
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

      {/* ─── HERO ────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-images">
          <div className="hero-img-left fade-up">
            <Image
              src="/images/hero-mugshot.png"
              alt="Mega Chad mugshot"
              width={380}
              height={480}
              priority
              style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
            />
          </div>
          <div className="hero-center fade-up">
            <Image
              src="/images/hero-tren.png"
              alt="Tren bottle"
              width={340}
              height={420}
              priority
              style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
            />
          </div>
          <div className="hero-text fade-up">
            <h1 className="hero-headline">
              a chad does what a chad wants
            </h1>
            <div className="hero-ca">CA: 0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888</div>
            <a href="https://www.kumbaya.xyz/#/launch/0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888" target="_blank" rel="noopener noreferrer" className="btn btn-primary hero-buy">BUY NOW</a>
          </div>
        </div>
      </section>

      {/* ─── CAROUSEL ────────────────────────────────── */}
      <section className="carousel-section">
        <div className="carousel">
          <div className="carousel-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
            {CAROUSEL_SLIDES.map((s, i) => (
              <div key={i} className="carousel-slide">
                <Image
                  src={s.src}
                  alt={s.alt}
                  width={1100}
                  height={500}
                  style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                />
              </div>
            ))}
          </div>
          <button className="carousel-arrow carousel-prev" onClick={prevSlide} aria-label="Previous">
            &#8249;
          </button>
          <button className="carousel-arrow carousel-next" onClick={nextSlide} aria-label="Next">
            &#8250;
          </button>
          <div className="carousel-dots">
            {CAROUSEL_SLIDES.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot ${i === slide ? 'active' : ''}`}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT ───────────────────────────────────── */}
      <section id="about" className="section about">
        <div className="about-inner">
          <div className="section-label">About MegaChad</div>
          <h2 className="section-heading">
            $MEGACHAD is the home of looksmaxxing on MegaETH
          </h2>
          <p>
            Every time you looksmaxx half the tokens are destroyed forever
            and half go to the tren fund. Every looksmaxx is stored permanently
            on-chain. The more you burn, the rarer everything becomes.
          </p>
          <a href="https://www.kumbaya.xyz/#/launch/0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888" target="_blank" rel="noopener noreferrer" className="btn btn-outline">Buy $MEGACHAD</a>
        </div>
      </section>

      {/* ─── BURN TO LOOKSMAXX ──────────────────────── */}
      <section id="burn" className="section burn">
        <h2 className="section-heading">Burn to Looksmaxx</h2>

        {!isConnected ? (
          <div className="burn-card">
            <div className="burn-connect-prompt">
              Connect your wallet to burn tokens and generate art. 50% burned forever, 50% to tren fund.
              <br />
              <button className="btn btn-primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="burn-card">
            <div className="burn-balance">
              <span className="burn-balance-label">Your Balance:</span>
              <span className="burn-balance-value">
                {formatBalance(balance as bigint | undefined)}
              </span>
            </div>

            <textarea
              className="burn-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your Mega Chad..."
              disabled={isBusy}
            />

            <button
              className={`btn btn-primary burn-submit ${
                status === 'idle' && prompt.trim() && hasEnough ? 'pulse-glow' : ''
              }`}
              onClick={status === 'done' || status === 'error' ? resetBurn : handleBurn}
              disabled={
                isBusy || (status === 'idle' && (!prompt.trim() || !hasEnough))
              }
            >
              {status === 'done'
                ? 'Create Another'
                : status === 'error'
                ? 'Try Again'
                : isBusy
                ? STATUS_LABELS[status]
                : `Burn ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD & Generate`}
            </button>

            {!hasEnough && status === 'idle' && (
              <div className="error-msg" style={{ marginTop: '1rem' }}>
                Insufficient balance. You need at least{' '}
                {BURN_AMOUNT_DISPLAY.toLocaleString()} tokens to burn.
              </div>
            )}

            {(isBusy || status === 'done') && (
              <>
                <div className="burn-progress">
                  {PROGRESS_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`burn-progress-step ${
                        i <= stepIndex(status) ? 'active' : ''
                      }`}
                    />
                  ))}
                </div>
                <div className="burn-status">{STATUS_LABELS[status]}</div>
              </>
            )}

            {error && <div className="error-msg">{error}</div>}

            {result && (
              <div className="burn-result">
                <img src={result.imageUrl} alt="Generated Mega Chad" />
                <div className="burn-result-links">
                  <a
                    href={result.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                  >
                    View on IPFS
                  </a>
                  <a
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                      `Just burned ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD to create this. @megachadxyz`
                    )}&url=${encodeURIComponent(result.ipfsUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Share on X
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="burn-stats">
          <div className="burn-stat">
            <div className="burn-stat-value">0</div>
            <div className="burn-stat-label">Total Burns</div>
          </div>
          <div className="burn-stat">
            <div className="burn-stat-value">0</div>
            <div className="burn-stat-label">Tokens Burned</div>
          </div>
          <div className="burn-stat">
            <div className="burn-stat-value">1B</div>
            <div className="burn-stat-label">Total Supply</div>
          </div>
        </div>
      </section>

      {/* ─── ROADMAP ─────────────────────────────────── */}
      <section id="roadmap" className="section roadmap">
        <h2 className="section-heading">Roadmap</h2>
        <div className="roadmap-grid">
          {[
            { date: 'Feb 9th', title: 'Bulk', desc: 'Respect the pump.' },
            { date: 'TBA', title: 'Cut', desc: 'Burn-to-looksmaxx. Every image permanently reduces supply.' },
            { date: 'TBA', title: 'Recomp', desc: 'Physiquemaxxers get recognition.' },
            { date: 'TBA', title: 'Looksmaxx', desc: 'Mog everyone.' },
          ].map((item) => (
            <div key={item.title} className="roadmap-item">
              <div className="roadmap-date">{item.date}</div>
              <div className="roadmap-title">{item.title}</div>
              <div className="roadmap-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── NOTABLE CHADS ───────────────────────────── */}
      <section id="chads" className="section chads">
        <h2 className="section-heading">Notable Chads</h2>
        <p className="chads-subtitle">
          Renowned chads who share insights into looksmaxxing, cardio, and escaping the matrix.
        </p>
        <div className="chads-grid">
          {CHADS.map((chad) => (
            <div key={chad.name} className="chad-card">
              <div className="chad-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={chad.img} alt={chad.name} />
              </div>
              <div className="chad-name">{chad.name}</div>
              <div className="chad-role">{chad.role}</div>
            </div>
          ))}
        </div>
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
              <li><a href="#about">About</a></li>
              <li><a href="#burn">Burn</a></li>
              <li><a href="#roadmap">Roadmap</a></li>
              <li><a href="#chads">Chads</a></li>
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
    </>
  );
}
