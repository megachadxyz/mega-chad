'use client';

import { BetaProviders } from './providers';
import { BetaNav } from './BetaNav';

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <BetaProviders>
      <BetaNav />
      <main className="beta-main">{children}</main>
    </BetaProviders>
  );
}
