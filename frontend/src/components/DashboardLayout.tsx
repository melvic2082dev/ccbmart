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
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== role) {
      router.push(`/${parsed.role}/dashboard`);
      return;
    }
    setUser(parsed);

    // Check saved sidebar state
    const saved = localStorage.getItem('sidebar-expanded');
    if (saved === 'true') setSidebarExpanded(true);

    // Listen for sidebar toggle events
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSidebarExpanded(detail.expanded);
    };
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

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Sidebar role={role} />
      <main
        className="p-6 min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarExpanded ? '14rem' : '4rem' }}
      >
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
