'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import { getRoleGroup, getDashboardHref } from '@/lib/permissions';

// Smart parent: derive a sensible back target from the URL.
// Rules:
//  - /[role]/dashboard or shorter → no back (we're at the role's home)
//  - /[role]/[section] → back to /[role]/dashboard
//  - /[role]/[section]/[...rest] → back to /[role]/[section] (strip last seg)
function computeBackHref(pathname: string | null): string | null {
  if (!pathname) return null;
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return null;
  if (segs.length === 1) return null;
  if (segs.length === 2 && segs[1] === 'dashboard') return null;
  if (segs.length === 2) return `/${segs[0]}/dashboard`;
  return '/' + segs.slice(0, -1).join('/');
}

export default function DashboardLayout({ role, children }: { role: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; rank?: string } | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const backHref = computeBackHref(pathname);

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
        className="min-h-screen p-4 sm:p-6 pt-14 lg:pt-6 lg:ml-[var(--sidebar-w)]"
        style={{ ['--sidebar-w' as string]: sidebarExpanded ? '14rem' : '4rem' }}
      >
        {/* Compact user badge in top-right corner — saves vertical space.
            On mobile (lg:hidden), padded to clear the hamburger button. */}
        <div className="absolute top-3 right-4 lg:top-4 lg:right-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground truncate max-w-[40vw] lg:max-w-none">{user.name}</span>
          {user.rank && <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">{user.rank}</span>}
        </div>

        {/* Smart back link — inline above the page heading, scrolls with
            content. Apple-style chevron + label, no chrome. Uses
            computeBackHref so refresh-then-back still resolves. */}
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground active:opacity-70 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Link>
        )}

        {children}
      </main>
    </div>
  );
}
