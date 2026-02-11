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
  BURN_ADDRESS,
  TREN_FUND_WALLET,
} from '@/lib/contracts';

type BurnStatus =
  | 'idle'
  | 'burning'
  | 'confirming'
  | 'burning2'
  | 'confirming2'
  | 'generating'
  | 'pinning'
  | 'minting'
  | 'done'
  | 'error';

const STATUS_LABELS: Record<BurnStatus, string> = {
  idle: '',
  burning: 'Signing burn transaction (1/2)...',
  confirming: 'Waiting for burn confirmation...',
  burning2: 'Signing dev wallet transfer (2/2)...',
  confirming2: 'Waiting for transfer confirmation...',
  generating: 'Generating your Mega Chad...',
  pinning: 'Pinning to IPFS...',
  minting: 'Minting your NFT...',
  done: 'Your Mega Chad is immortalized.',
  error: 'Something went wrong.',
};

const PROGRESS_STEPS = ['burning', 'confirming', 'burning2', 'confirming2', 'generating', 'pinning', 'minting', 'done'] as const;

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<BurnStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imageUrl: string;
    ipfsUrl: string;
    cid: string;
    tokenId?: string;
  } | null>(null);

  const HALF_AMOUNT = BURN_AMOUNT / 2n;

  // --- Transfer 1: burn to dead address ---
  const {
    writeContract: writeBurn,
    data: burnTxHash,
    error: burnWriteError,
    reset: resetBurn1,
  } = useWriteContract();

  const { isSuccess: burnConfirmed, isError: burnFailed } =
    useWaitForTransactionReceipt({
      hash: burnTxHash,
      query: { enabled: !!burnTxHash },
    });

  // --- Transfer 2: send to dev wallet ---
  const {
    writeContract: writeDev,
    data: devTxHash,
    error: devWriteError,
    reset: resetDev,
  } = useWriteContract();

  const { isSuccess: devConfirmed, isError: devFailed } =
    useWaitForTransactionReceipt({
      hash: devTxHash,
      query: { enabled: !!devTxHash },
    });

  // Handle write errors for transfer 1
  useEffect(() => {
    if (burnWriteError && status === 'burning') {
      setStatus('error');
      setError(burnWriteError.message.includes('User rejected')
        ? 'Transaction rejected.'
        : burnWriteError.message.slice(0, 120));
    }
  }, [burnWriteError, status]);

  // Handle write errors for transfer 2
  useEffect(() => {
    if (devWriteError && status === 'burning2') {
      setStatus('error');
      setError(devWriteError.message.includes('User rejected')
        ? 'Transaction rejected.'
        : devWriteError.message.slice(0, 120));
    }
  }, [devWriteError, status]);

  // When burn tx hash arrives, move to confirming
  useEffect(() => {
    if (burnTxHash && status === 'burning') {
      setStatus('confirming');
    }
  }, [burnTxHash, status]);

  // When burn confirmed, fire transfer 2
  useEffect(() => {
    if (burnConfirmed && status === 'confirming') {
      setStatus('burning2');
      writeDev({
        address: MEGACHAD_ADDRESS,
        abi: MEGACHAD_ABI,
        functionName: 'transfer',
        args: [TREN_FUND_WALLET, HALF_AMOUNT],
      });
    }
    if (burnFailed && status === 'confirming') {
      setStatus('error');
      setError('Burn transaction failed on-chain.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burnConfirmed, burnFailed, status]);

  // When dev tx hash arrives, move to confirming2
  useEffect(() => {
    if (devTxHash && status === 'burning2') {
      setStatus('confirming2');
    }
  }, [devTxHash, status]);

  // When dev transfer confirmed, call generate API
  useEffect(() => {
    if (devConfirmed && devTxHash && burnTxHash && status === 'confirming2') {
      generateImage(burnTxHash, devTxHash);
    }
    if (devFailed && status === 'confirming2') {
      setStatus('error');
      setError('Dev wallet transfer failed on-chain.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devConfirmed, devFailed, devTxHash, burnTxHash, status]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be under 4MB.');
      return;
    }

    setError(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBurn = () => {
    if (!imageFile || !isConnected) return;
    setStatus('burning');
    setError(null);
    setResult(null);
    resetBurn1();
    resetDev();

    // Transfer 1: burn half to dead address
    writeBurn({
      address: MEGACHAD_ADDRESS,
      abi: MEGACHAD_ABI,
      functionName: 'transfer',
      args: [BURN_ADDRESS, HALF_AMOUNT],
    });
  };

  async function generateImage(burnHash: string, devHash: string) {
    setStatus('generating');
    try {
      const formData = new FormData();
      formData.append('burnTxHash', burnHash);
      formData.append('devTxHash', devHash);
      formData.append('burnerAddress', address!);
      formData.append('image', imageFile!);

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setStatus('done');
      setResult({
        imageUrl: data.imageUrl || data.ipfsUrl,
        ipfsUrl: data.ipfsUrl,
        cid: data.ipfsCid,
        tokenId: data.tokenId,
      });
      refetchBalance();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
  }

  const resetFlow = () => {
    setStatus('idle');
    setError(null);
    setResult(null);
    removeImage();
    resetBurn1();
    resetDev();
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

  // ─── Burn stats ─────────────────────────────────────
  const [stats, setStats] = useState<{
    totalSupply: number | null;
    tokensBurned: number | null;
    totalBurns: number | null;
  }>({ totalSupply: null, tokensBurned: null, totalBurns: null });

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/stats')
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

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

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div
              className={`burn-upload-zone ${imagePreview ? 'has-preview' : ''}`}
              onClick={() => !imagePreview && !isBusy && fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="burn-upload-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Upload preview" />
                  {!isBusy && (
                    <button className="burn-upload-remove" onClick={(e) => { e.stopPropagation(); removeImage(); }} aria-label="Remove image">
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div className="burn-upload-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Upload your photo to looksmaxx
                </div>
              )}
            </div>

            <button
              className={`btn btn-primary burn-submit ${
                status === 'idle' && imageFile && hasEnough ? 'pulse-glow' : ''
              }`}
              onClick={status === 'done' || status === 'error' ? resetFlow : handleBurn}
              disabled={
                isBusy || (status === 'idle' && (!imageFile || !hasEnough))
              }
            >
              {status === 'done'
                ? 'Create Another'
                : status === 'error'
                ? 'Try Again'
                : isBusy
                ? STATUS_LABELS[status]
                : `BURN ${BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD & LOOKSMAXX`}
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
                {result.tokenId && (
                  <div className="burn-result-nft">
                    NFT #{result.tokenId} minted to your wallet
                  </div>
                )}
                <div className="burn-result-links">
                  <a
                    href={result.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                  >
                    View on IPFS
                  </a>
                  {result.tokenId && (
                    <a
                      href={`https://megaexplorer.xyz/token/${process.env.NEXT_PUBLIC_NFT_CONTRACT}/instance/${result.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                    >
                      View NFT
                    </a>
                  )}
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
            <div className="burn-stat-value">
              {stats.totalBurns !== null ? stats.totalBurns.toLocaleString() : '—'}
            </div>
            <div className="burn-stat-label">Total Burns</div>
          </div>
          <div className="burn-stat">
            <div className="burn-stat-value">
              {stats.tokensBurned !== null ? stats.tokensBurned.toLocaleString() : '—'}
            </div>
            <div className="burn-stat-label">Tokens Burned</div>
          </div>
          <div className="burn-stat">
            <div className="burn-stat-value">
              {stats.totalSupply !== null ? stats.totalSupply.toLocaleString() : '—'}
            </div>
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
