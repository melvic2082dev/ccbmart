'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayout({ role, children }: { role: string; children: React.ReactNode }) {
  const router = useRouter();
  const checkedRef = useRef(false);

  // Start with SSR-safe defaults, then read localStorage post-mount. Renders the
  // full chrome (sidebar + main area) immediately — no full-screen spinner — so
  // client-side navigation between admin pages doesn't flash a loading state.
  const [user, setUser] = useState<{ name: string; role: string; rank?: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (token && userData) setUser(JSON.parse(userData));
    } catch {}
    setSidebarExpanded(localStorage.getItem('sidebar-expanded') === 'true');
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (checkedRef.current) return;
    checkedRef.current = true;
    if (!user) { router.push('/login'); return; }
    if (user.role !== role) { router.push(`/${user.role}/dashboard`); return; }
  }, [authReady, user, role, router]);

  useEffect(() => {
    const handler = (e: Event) => setSidebarExpanded((e as CustomEvent).detail.expanded);
    window.addEventListener('sidebar-toggle', handler);
    return () => window.removeEventListener('sidebar-toggle', handler);
  }, []);

  const desktopMl = sidebarExpanded ? '14rem' : '4rem';
  const authPassed = authReady && user && user.role === role;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar role={role} />
      <main className="min-h-screen p-4 sm:p-6 pt-16 lg:pt-6" style={{}}>
        <style>{`@media (min-width: 1024px) { main { margin-left: ${desktopMl} !important; } }`}</style>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Xin chào,</p>
            <p className="text-lg font-semibold">
              {user ? `${user.name}${user.rank ? ` (${user.rank})` : ''}` : '\u00A0'}
            </p>
          </div>
        </div>
        {authPassed ? children : (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
