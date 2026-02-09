import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: '$MEGACHAD — Burn to Looksmaxx',
  description:
    'Burn $MEGACHAD tokens on MegaETH to generate AI art. The home of looksmaxxing on MegaETH.',
  icons: {
    icon: '/images/megachad-logo.png',
    apple: '/images/megachad-logo.png',
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
