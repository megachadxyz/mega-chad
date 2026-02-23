import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="landing-container">
      {/* Background Image */}
      <div className="landing-bg">
        <Image
          src="/images/landing-bg.png"
          alt="MegaChad"
          fill
          priority
          style={{ objectFit: 'cover' }}
          quality={100}
        />
        <div className="landing-overlay" />
      </div>

      {/* Content */}
      <div className="landing-content">
        {/* Logo */}
        <div className="landing-logo">
          <Image
            src="/images/megachad-logo.png"
            alt="$MEGACHAD"
            width={300}
            height={80}
            priority
          />
        </div>

        {/* Tagline */}
        <h1 className="landing-title">LOOKSMAXXING ON MEGAETH</h1>

        {/* Enter Button */}
        <Link href="/main" className="enter-button">
          ENTER SITE
        </Link>

        {/* Footer Links */}
        <footer className="landing-footer">
          <Link href="/about">About</Link>
          <span className="footer-sep">•</span>
          <Link href="/docs">Docs</Link>
          <span className="footer-sep">•</span>
          <Link href="/privacy">Privacy</Link>
          <span className="footer-sep">•</span>
          <Link href="/terms">Terms</Link>
        </footer>
      </div>

      <style jsx>{`
        .landing-container {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .landing-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }

        .landing-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 10, 15, 0.3) 0%,
            rgba(10, 10, 15, 0.7) 50%,
            rgba(10, 10, 15, 0.85) 100%
          );
          z-index: 1;
        }

        .landing-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3rem;
          padding: 2rem;
          text-align: center;
        }

        .landing-logo {
          filter: drop-shadow(0 0 20px rgba(247, 134, 198, 0.4));
        }

        .landing-title {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 8vw, 5rem);
          letter-spacing: 0.05em;
          color: var(--pink);
          text-shadow:
            0 0 20px rgba(247, 134, 198, 0.6),
            0 0 40px rgba(247, 134, 198, 0.4),
            0 0 60px rgba(247, 134, 198, 0.2);
          margin: 0;
        }

        .enter-button {
          font-family: var(--font-display);
          font-size: 2.5rem;
          letter-spacing: 0.1em;
          padding: 1.5rem 4rem;
          background: var(--pink);
          color: #000;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--pink-glow-lg);
          position: relative;
          overflow: hidden;
        }

        .enter-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transform: translateX(-100%);
          transition: transform 0.6s;
        }

        .enter-button:hover {
          background: #ff9ed8;
          transform: translateY(-2px);
          box-shadow:
            0 0 40px rgba(247, 134, 198, 0.7),
            0 0 100px rgba(247, 134, 198, 0.3),
            0 0 160px rgba(247, 134, 198, 0.1);
        }

        .enter-button:hover::before {
          transform: translateX(100%);
        }

        .enter-button:active {
          transform: translateY(0);
        }

        .landing-footer {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--text-dim);
          margin-top: 2rem;
        }

        .landing-footer a {
          color: var(--text);
          text-decoration: none;
          transition: color 0.2s;
        }

        .landing-footer a:hover {
          color: var(--pink);
        }

        .footer-sep {
          color: var(--text-dim);
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .landing-content {
            gap: 2rem;
          }

          .enter-button {
            font-size: 2rem;
            padding: 1.2rem 3rem;
          }

          .landing-footer {
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
