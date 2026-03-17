import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const BASE_URL = 'https://megachad.xyz';

// ── Shared styles ────────────────────────────────────────────────────────

const BG = '#0a0a0f';
const PINK = '#F786C6';
const PINK_DIM = '#F786C680';
const WHITE = '#ffffff';
const GRAY = '#888888';

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: BG,
        color: WHITE,
        fontFamily: 'sans-serif',
        padding: '40px 50px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Scanline overlay effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(247,134,198,0.03) 2px, rgba(247,134,198,0.03) 4px)',
          display: 'flex',
        }}
      />
      {children}
    </div>
  );
}

function Title({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 52,
        fontWeight: 700,
        color: PINK,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginBottom: '12px',
        display: 'flex',
      }}
    >
      {text}
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(247,134,198,0.08)',
        border: `1px solid ${PINK_DIM}`,
        borderRadius: '12px',
        padding: '16px 24px',
        minWidth: '200px',
      }}
    >
      <div style={{ fontSize: 18, color: GRAY, display: 'flex' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: WHITE,
          display: 'flex',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Splash view ──────────────────────────────────────────────────────────

async function splashImage() {
  let tokensBurned = '—';
  let totalBurns = '—';

  try {
    const res = await fetch(`${BASE_URL}/api/stats`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.tokensBurned != null) {
        tokensBurned = Number(data.tokensBurned).toLocaleString();
      }
      if (data.totalBurns != null) {
        totalBurns = String(data.totalBurns);
      }
    }
  } catch {}

  return new ImageResponse(
    (
      <Container>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: '24px',
          }}
        >
          <Title text="$MEGACHAD" />
          <div
            style={{
              fontSize: 24,
              color: GRAY,
              marginBottom: '20px',
              display: 'flex',
            }}
          >
            Burn-to-Create Looksmaxxing Engine on MegaETH
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <StatBox label="TOKENS BURNED" value={tokensBurned} />
            <StatBox label="TOTAL BURNS" value={totalBurns} />
          </div>
          <div
            style={{
              fontSize: 16,
              color: PINK_DIM,
              marginTop: '16px',
              display: 'flex',
            }}
          >
            megachad.xyz
          </div>
        </div>
      </Container>
    ),
    { width: 1200, height: 630 },
  );
}

// ── Gallery view ─────────────────────────────────────────────────────────

async function galleryImage(imgUrl: string, burner: string) {
  const shortBurner = burner
    ? `${burner.slice(0, 6)}...${burner.slice(-4)}`
    : 'Unknown';

  return new ImageResponse(
    (
      <Container>
        <div
          style={{
            display: 'flex',
            height: '100%',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          {/* Left: image */}
          <div
            style={{
              display: 'flex',
              width: '400px',
              height: '400px',
              borderRadius: '16px',
              border: `2px solid ${PINK_DIM}`,
              overflow: 'hidden',
              flexShrink: 0,
              background: '#1a1a2e',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt="Looksmaxxed"
                width={400}
                height={400}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  fontSize: 48,
                  color: PINK,
                  display: 'flex',
                }}
              >
                ?
              </div>
            )}
          </div>

          {/* Right: info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '16px',
              flex: 1,
            }}
          >
            <Title text="LATEST BURN" />
            <div
              style={{
                fontSize: 22,
                color: GRAY,
                display: 'flex',
              }}
            >
              Looksmaxxed by
            </div>
            <div
              style={{
                fontSize: 28,
                color: PINK,
                fontFamily: 'monospace',
                display: 'flex',
              }}
            >
              {shortBurner}
            </div>
            <div
              style={{
                fontSize: 18,
                color: GRAY,
                marginTop: '20px',
                display: 'flex',
              }}
            >
              225,000 $MEGACHAD burned
            </div>
          </div>
        </div>
      </Container>
    ),
    { width: 1200, height: 630 },
  );
}

// ── Leaderboard view ─────────────────────────────────────────────────────

async function leaderboardImage(data: string) {
  let entries: { address: string; megaName: string; burns: number }[] = [];
  try {
    entries = JSON.parse(decodeURIComponent(data));
  } catch {}

  const medals = ['1st', '2nd', '3rd'];

  return new ImageResponse(
    (
      <Container>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <Title text="CHADBOARD" />
          <div
            style={{
              fontSize: 20,
              color: GRAY,
              marginBottom: '12px',
              display: 'flex',
            }}
          >
            Top Burners
          </div>
          {entries.length > 0
            ? entries.map((e, i) => {
                const name =
                  e.megaName ||
                  `${e.address.slice(0, 6)}...${e.address.slice(-4)}`;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      background: 'rgba(247,134,198,0.06)',
                      border: `1px solid ${i === 0 ? PINK : PINK_DIM}`,
                      borderRadius: '12px',
                      padding: '16px 24px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: i === 0 ? PINK : WHITE,
                        width: '60px',
                        display: 'flex',
                      }}
                    >
                      {medals[i]}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        color: WHITE,
                        flex: 1,
                        fontFamily: 'monospace',
                        display: 'flex',
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        color: PINK,
                        display: 'flex',
                      }}
                    >
                      {e.burns} burn{e.burns !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })
            : (
              <div style={{ fontSize: 24, color: GRAY, display: 'flex' }}>
                No burns yet. Be the first to looksmaxx!
              </div>
            )}
        </div>
      </Container>
    ),
    { width: 1200, height: 630 },
  );
}

// ── Price view ───────────────────────────────────────────────────────────

async function priceImage(eth: string, mega: string, burn: string) {
  const ethPrice = parseFloat(eth) || 0;
  const megaPerEth = parseFloat(mega) || 0;
  const burnCost = parseFloat(burn) || 0;

  const fmtEth = ethPrice > 0 ? ethPrice.toExponential(4) : '—';
  const fmtMega = megaPerEth > 0 ? Math.floor(megaPerEth).toLocaleString() : '—';
  const fmtBurn = burnCost > 0 ? `${burnCost.toFixed(6)} ETH` : '—';

  return new ImageResponse(
    (
      <Container>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <Title text="$MEGACHAD PRICE" />
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <StatBox label="ETH PER MEGACHAD" value={fmtEth} />
            <StatBox label="MEGACHAD PER ETH" value={fmtMega} />
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
            <StatBox label="BURN COST (225K)" value={fmtBurn} />
          </div>
          <div
            style={{
              fontSize: 16,
              color: GRAY,
              marginTop: '12px',
              display: 'flex',
            }}
          >
            Kumbaya DEX on MegaETH
          </div>
        </div>
      </Container>
    ),
    { width: 1200, height: 630 },
  );
}

// ── Route handler ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'splash';

  try {
    switch (view) {
      case 'gallery':
        return galleryImage(
          searchParams.get('img') || '',
          searchParams.get('burner') || '',
        );
      case 'leaderboard':
        return leaderboardImage(searchParams.get('data') || '[]');
      case 'price':
        return priceImage(
          searchParams.get('eth') || '0',
          searchParams.get('mega') || '0',
          searchParams.get('burn') || '0',
        );
      default:
        return splashImage();
    }
  } catch (err) {
    console.error('[Frame Image] Error:', err);
    return splashImage();
  }
}
