import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

const TITLE = '$MEGACHAD — Looksmaxxing on MegaETH';
const DESCRIPTION =
  'Burn-to-create looksmaxxing engine on MegaETH. Burn 225,000 $MEGACHAD to generate AI-enhanced portraits, mint NFTs, and earn $MEGAGOONER through staking + governance. Full MEGA Protocol: AMM, staking, governance, emissions.';
const OG_IMAGE = 'https://megachad.xyz/api/frame/image?view=splash';

export const metadata: Metadata = {
  metadataBase: new URL('https://megachad.xyz'),
  title: {
    default: TITLE,
    template: '%s | $MEGACHAD',
  },
  description: DESCRIPTION,
  applicationName: 'MegaChad',
  keywords: [
    'MegaChad',
    'MEGACHAD',
    'MEGAGOONER',
    'MegaETH',
    'looksmaxxing',
    'burn-to-mint',
    'AI NFT',
    'DeFi',
    'AMM',
    'staking',
    'governance',
    'MEGA Protocol',
    'ERC-8004',
    'x402',
    'AI agents',
    'crypto',
    'Ethereum',
    'L2',
  ],
  authors: [{ name: 'MegaChad', url: 'https://megachad.xyz' }],
  creator: 'MegaChad',
  publisher: 'MegaChad',
  category: 'Finance',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
    types: {
      'application/json': [
        { url: '/.well-known/agent.json', title: 'A2A agent card' },
        { url: '/.well-known/mcp.json', title: 'MCP manifest' },
        { url: '/.well-known/openapi.json', title: 'OpenAPI spec' },
        { url: '/.well-known/megachad-protocol.json', title: 'Protocol registry' },
      ],
      'text/plain': [
        { url: '/llms.txt', title: 'LLM-friendly site index' },
        { url: '/agents.txt', title: 'Human-readable agent manifest' },
      ],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/chadfavicon.jpg',
    apple: '/chadfavicon.jpg',
    shortcut: '/chadfavicon.jpg',
  },
  openGraph: {
    type: 'website',
    siteName: 'MegaChad',
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://megachad.xyz',
    locale: 'en_US',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'MegaChad — Looksmaxxing on MegaETH',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
    creator: '@megachadxyz',
    site: '@megachadxyz',
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': OG_IMAGE,
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:post_url': 'https://megachad.xyz/api/frame',
    'fc:frame:button:1': 'Gallery',
    'fc:frame:button:2': 'Leaderboard',
    'fc:frame:button:3': 'Price',
    'fc:frame:button:4': 'Looksmaxx',
    'fc:frame:button:4:action': 'link',
    'fc:frame:button:4:target': 'https://megachad.xyz',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://megachad.xyz/#org',
      name: 'MegaChad',
      url: 'https://megachad.xyz',
      logo: 'https://megachad.xyz/images/megachad-logo.png',
      sameAs: [
        'https://x.com/megachadxyz',
        'https://github.com/megachadxyz/mega-chad',
        'https://warpcast.com/megachad',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://megachad.xyz/#website',
      url: 'https://megachad.xyz',
      name: 'MegaChad',
      description: DESCRIPTION,
      publisher: { '@id': 'https://megachad.xyz/#org' },
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://megachad.xyz/#app',
      name: 'MegaChad — MEGA Protocol',
      url: 'https://megachad.xyz',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description: DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@id': 'https://megachad.xyz/#org' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is MegaChad?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MegaChad is a burn-to-create looksmaxxing engine on MegaETH. Burn 225,000 $MEGACHAD to generate an AI-enhanced portrait and mint a unique looksmaxxed NFT. The MEGA Protocol stack includes a $MEGACHAD/$MEGAGOONER AMM, staking, governance, NFT veto council, and a 225-week emission schedule.',
          },
        },
        {
          '@type': 'Question',
          name: 'What chain does MegaChad run on?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MegaETH mainnet (chain ID 4326). RPC: https://mainnet.megaeth.com/rpc — ~250ms blocks.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can AI agents use MegaChad?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. MegaChad exposes A2A (agent.json), MCP (/api/mcp + mcp.json), OpenAI plugin (ai-plugin.json), OpenAPI 3.1, ERC-8004 agent registration, llms.txt, and a master /api/agent index. Natural-language queries go to /api/agent/chat, which returns ready-to-sign calldata for every protocol surface.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
