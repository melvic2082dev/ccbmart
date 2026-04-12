'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayout({ role, children }: { role: string; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; rank?: string } | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role !== role) { router.push(`/${parsed.role}/dashboard`); return; }
    setUser(parsed);

    const saved = localStorage.getItem('sidebar-expanded');
    if (saved === 'true') setSidebarExpanded(true);

    const handler = (e: Event) => setSidebarExpanded((e as CustomEvent).detail.expanded);
    window.addEventListener('sidebar-toggle', handler);
    return () => window.removeEventListener('sidebar-toggle', handler);
  }, [role, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Desktop: ml based on sidebar width. Mobile: no ml (sidebar is overlay)
  const desktopMl = sidebarExpanded ? '14rem' : '4rem';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar role={role} />
      <main className="min-h-screen p-4 sm:p-6 pt-16 lg:pt-6 transition-all duration-300" style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? desktopMl : undefined }}>
        <style>{`@media (min-width: 1024px) { main { margin-left: ${desktopMl} !important; } }`}</style>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Xin chao,</p>
            <p className="text-lg font-semibold">{user.name} {user.rank ? `(${user.rank})` : ''}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
