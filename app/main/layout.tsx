import { MainNav } from '@/components/MainNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MainNav />
      {children}
    </>
  );
}
