import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: '$MEGACHAD - Looksmaxxing on MegaETH',
  description: 'The home of looksmaxxing on MegaETH.',
  icons: {
    icon: '/chadfavicon.jpg',
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
