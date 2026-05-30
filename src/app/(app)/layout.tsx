import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ensureUserProvisioned } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureUserProvisioned();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-x-hidden pb-24 md:pb-6">
          <div className="container py-6">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
