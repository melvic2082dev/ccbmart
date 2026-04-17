'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayout({ role, children }: { role: string; children: React.ReactNode }) {
  const router = useRouter();
  const checkedRef = useRef(false);

  // Start with SSR-safe defaults. localStorage is only read after mount in useEffect
  // to avoid server/client HTML mismatch (hydration error).
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; rank?: string } | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (token && userData) setUser(JSON.parse(userData));
    } catch {}
    setSidebarExpanded(localStorage.getItem('sidebar-expanded') === 'true');
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (checkedRef.current) return;
    checkedRef.current = true;
    if (!user) { router.push('/login'); return; }
    if (user.role !== role) { router.push(`/${user.role}/dashboard`); return; }
  }, [mounted, user, role, router]);

  useEffect(() => {
    const handler = (e: Event) => setSidebarExpanded((e as CustomEvent).detail.expanded);
    window.addEventListener('sidebar-toggle', handler);
    return () => window.removeEventListener('sidebar-toggle', handler);
  }, []);

  if (!mounted || !user || user.role !== role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const desktopMl = sidebarExpanded ? '14rem' : '4rem';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar role={role} />
      <main className="min-h-screen p-4 sm:p-6 pt-16 lg:pt-6" style={{}}>
        <style>{`@media (min-width: 1024px) { main { margin-left: ${desktopMl} !important; } }`}</style>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Xin chào,</p>
            <p className="text-lg font-semibold">{user.name} {user.rank ? `(${user.rank})` : ''}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
