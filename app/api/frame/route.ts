import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://megachad.xyz';
const IMAGE_URL = `${BASE_URL}/api/frame/image`;

// ── Helpers ──────────────────────────────────────────────────────────────

function frameHtml(opts: {
  imageUrl: string;
  buttons: { label: string; action?: string; target?: string }[];
  postUrl?: string;
}) {
  const { imageUrl, buttons, postUrl } = opts;
  const buttonTags = buttons
    .map((b, i) => {
      const idx = i + 1;
      let tags = `<meta property="fc:frame:button:${idx}" content="${b.label}" />`;
      if (b.action) tags += `\n    <meta property="fc:frame:button:${idx}:action" content="${b.action}" />`;
      if (b.target) tags += `\n    <meta property="fc:frame:button:${idx}:target" content="${b.target}" />`;
      return tags;
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    ${postUrl ? `<meta property="fc:frame:post_url" content="${postUrl}" />` : ''}
    ${buttonTags}
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:title" content="$MEGACHAD - Looksmaxxing on MegaETH" />
  </head>
  <body></body>
</html>`;
}

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error(`[Frame] fetch failed: ${url}`, err);
    return null;
  }
}

// ── Splash / Home frame ─────────────────────────────────────────────────

function splashFrame() {
  return htmlResponse(
    frameHtml({
      imageUrl: `${IMAGE_URL}?view=splash&t=${Math.floor(Date.now() / 30000)}`,
      postUrl: `${BASE_URL}/api/frame`,
      buttons: [
        { label: '🖼 Gallery' },
        { label: '🏆 Leaderboard' },
        { label: '💰 Price' },
        { label: '🔥 Looksmaxx', action: 'link', target: BASE_URL },
      ],
    }),
  );
}

// ── Gallery frame ───────────────────────────────────────────────────────

async function galleryFrame() {
  const data = await fetchJson(`${BASE_URL}/api/gallery?limit=1`);
  const burn = data?.burns?.[0];

  const imageParam = burn?.ipfsUrl
    ? encodeURIComponent(
        burn.ipfsUrl
          .replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
          .replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/'),
      )
    : '';

  return htmlResponse(
    frameHtml({
      imageUrl: `${IMAGE_URL}?view=gallery&img=${imageParam}&burner=${burn?.burner || ''}&t=${Math.floor(Date.now() / 30000)}`,
      postUrl: `${BASE_URL}/api/frame`,
      buttons: [
        { label: '⬅ Back' },
        { label: '🏆 Leaderboard' },
        { label: '🔥 Looksmaxx', action: 'link', target: BASE_URL },
      ],
    }),
  );
}

// ── Leaderboard frame ───────────────────────────────────────────────────

async function leaderboardFrame() {
  const data = await fetchJson(`${BASE_URL}/api/chadboard`);
  const top3 = (data?.entries || []).slice(0, 3);

  const encoded = encodeURIComponent(
    JSON.stringify(
      top3.map((e: any) => ({
        address: e.address,
        megaName: e.megaName || '',
        burns: e.totalBurns,
      })),
    ),
  );

  return htmlResponse(
    frameHtml({
      imageUrl: `${IMAGE_URL}?view=leaderboard&data=${encoded}&t=${Math.floor(Date.now() / 30000)}`,
      postUrl: `${BASE_URL}/api/frame`,
      buttons: [
        { label: '⬅ Back' },
        { label: '🖼 Gallery' },
        { label: '🔥 Looksmaxx', action: 'link', target: BASE_URL },
      ],
    }),
  );
}

// ── Price frame ─────────────────────────────────────────────────────────

async function priceFrame() {
  const data = await fetchJson(`${BASE_URL}/api/price`);

  const ethPrice = data?.price?.ethPerMegachad ?? 0;
  const megaPerEth = data?.price?.megachadPerEth ?? 0;
  const burnCost = data?.burnCost?.estimatedEth ?? 0;

  return htmlResponse(
    frameHtml({
      imageUrl: `${IMAGE_URL}?view=price&eth=${ethPrice}&mega=${megaPerEth}&burn=${burnCost}&t=${Math.floor(Date.now() / 30000)}`,
      postUrl: `${BASE_URL}/api/frame`,
      buttons: [
        { label: '⬅ Back' },
        { label: '🖼 Gallery' },
        { label: '🔥 Looksmaxx', action: 'link', target: BASE_URL },
      ],
    }),
  );
}

// ── POST handler (button clicks) ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const buttonIndex = body?.untrustedData?.buttonIndex;

    // Determine current view from the referer/image URL to route correctly.
    // Farcaster sends buttonIndex (1-based).
    // From splash: 1=Gallery, 2=Leaderboard, 3=Price, 4=Looksmaxx (link)
    // From gallery: 1=Back, 2=Leaderboard, 3=Looksmaxx (link)
    // From leaderboard: 1=Back, 2=Gallery, 3=Looksmaxx (link)
    // From price: 1=Back, 2=Gallery, 3=Looksmaxx (link)

    // We check the state to determine where the user is.
    // Since Farcaster v1 frames don't have great state management,
    // we use the post_url pattern - all routes point to the same endpoint.
    // We'll use the image URL in the request to determine current state.

    const imageUrl = body?.untrustedData?.url || '';
    const isSplash =
      !imageUrl ||
      imageUrl.includes('view=splash') ||
      !body?.untrustedData?.buttonIndex;

    // For splash screen
    if (isSplash || !body?.untrustedData?.state) {
      switch (buttonIndex) {
        case 1:
          return galleryFrame();
        case 2:
          return leaderboardFrame();
        case 3:
          return priceFrame();
        default:
          return splashFrame();
      }
    }

    // For sub-pages, button 1 is always "Back"
    if (buttonIndex === 1) {
      return splashFrame();
    }

    // Button 2 from sub-pages varies
    const state = body?.untrustedData?.state || '';
    if (state.includes('gallery')) {
      if (buttonIndex === 2) return leaderboardFrame();
    } else if (state.includes('leaderboard')) {
      if (buttonIndex === 2) return galleryFrame();
    } else if (state.includes('price')) {
      if (buttonIndex === 2) return galleryFrame();
    }

    // Default fallback: try to route by button index from splash
    switch (buttonIndex) {
      case 1:
        return galleryFrame();
      case 2:
        return leaderboardFrame();
      case 3:
        return priceFrame();
      default:
        return splashFrame();
    }
  } catch (err) {
    console.error('[Frame] POST error:', err);
    return splashFrame();
  }
}

// ── GET handler (initial frame load when URL is shared) ─────────────────

export async function GET() {
  return splashFrame();
}
