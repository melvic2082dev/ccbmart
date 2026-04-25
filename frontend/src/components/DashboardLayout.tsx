'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { getRoleGroup, getDashboardHref } from '@/lib/permissions';

export default function DashboardLayout({ role, children }: { role: string; children: React.ReactNode }) {
  const router = useRouter();
  const checkedRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; rank?: string } | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (token && userData) setUser(JSON.parse(userData));
    } catch {}
    setSidebarExpanded(localStorage.getItem('sidebar-expanded') === 'true');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || checkedRef.current) return;
    checkedRef.current = true;
    if (!user) { router.push('/login'); return; }
    // Allow any admin sub-role into the 'admin' layout group; same for ctv/agency/member.
    if (getRoleGroup(user.role) !== role) { router.push(getDashboardHref(user.role)); return; }
  }, [mounted, user, role, router]);

  useEffect(() => {
    const handler = (e: Event) => setSidebarExpanded((e as CustomEvent).detail.expanded);
    window.addEventListener('sidebar-toggle', handler);
    return () => window.removeEventListener('sidebar-toggle', handler);
  }, []);

  if (!mounted || !user || getRoleGroup(user.role) !== role) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar role={user.role} />
      <main
        className="min-h-screen p-4 sm:p-6 pt-16 lg:pt-6 lg:ml-[var(--sidebar-w)]"
        style={{ ['--sidebar-w' as string]: sidebarExpanded ? '14rem' : '4rem' }}
      >
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
