import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: '$MEGACHAD - Looksmaxxing on MegaETH',
  description: 'The home of looksmaxxing on MegaETH.',
  icons: {
    icon: '/chadfavicon.jpg',
  },
  openGraph: {
    title: '$MEGACHAD - Looksmaxxing on MegaETH',
    description: 'Burn-to-create looksmaxxing engine on MegaETH. Burn 225,000 $MEGACHAD to generate AI-enhanced portraits and mint NFTs.',
    images: ['https://megachad.xyz/api/frame/image?view=splash'],
    url: 'https://megachad.xyz',
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://megachad.xyz/api/frame/image?view=splash',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
