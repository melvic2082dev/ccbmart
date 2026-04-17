'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse,
  Settings, FileText, LogOut, Building2, Bell,
  PlusCircle, Banknote, ClipboardCheck, Wallet, Award, CreditCard,
  ChevronLeft, ChevronRight, Sun, Moon, Menu, X, FileSpreadsheet,
  Scale, Calculator, Gift
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

type NavItem = { label: string; href: string; icon: React.ReactNode };

const navByRole: Record<string, NavItem[]> = {
  ctv: [
    { label: 'Dashboard', href: '/ctv/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Tao don', href: '/ctv/sales/create', icon: <PlusCircle size={20} /> },
    { label: 'Giao dich', href: '/ctv/transactions', icon: <ShoppingCart size={20} /> },
    { label: 'Nop tien', href: '/ctv/cash', icon: <Banknote size={20} /> },
    { label: 'Khach hang', href: '/ctv/customers', icon: <Users size={20} /> },
    { label: 'San pham', href: '/ctv/products', icon: <Package size={20} /> },
  ],
  agency: [
    { label: 'Dashboard', href: '/agency/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Ton kho', href: '/agency/inventory', icon: <Warehouse size={20} /> },
    { label: 'Giao dich', href: '/agency/transactions', icon: <ShoppingCart size={20} /> },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Doi soat', href: '/admin/reconciliation', icon: <ClipboardCheck size={20} /> },
    { label: 'CTV', href: '/admin/ctv', icon: <Users size={20} /> },
    { label: 'Dai ly', href: '/admin/agencies', icon: <Building2 size={20} /> },
    { label: 'Bo nhiem', href: '/admin/promotions', icon: <Scale size={20} /> },
    { label: 'Luong linh hoat', href: '/admin/soft-salary', icon: <Calculator size={20} /> },
    { label: 'Thuong dan dat', href: '/admin/team-bonus', icon: <Gift size={20} /> },
    { label: 'Danh hieu', href: '/admin/titles', icon: <Award size={20} /> },
    { label: 'Thanh vien', href: '/admin/membership/wallets', icon: <Users size={20} /> },
    { label: 'Nap tien TV', href: '/admin/membership/deposits', icon: <CreditCard size={20} /> },
    { label: 'Hang the', href: '/admin/membership/tiers', icon: <Wallet size={20} /> },
    { label: 'Import', href: '/admin/import', icon: <FileSpreadsheet size={20} /> },
    { label: 'Cau hinh', href: '/admin/config', icon: <Settings size={20} /> },
    { label: 'Bao cao', href: '/admin/reports', icon: <FileText size={20} /> },
  ],
  member: [
    { label: 'Dashboard', href: '/member/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Nap tien', href: '/member/topup', icon: <Banknote size={20} /> },
    { label: 'Lich su', href: '/member/transactions', icon: <ShoppingCart size={20} /> },
    { label: 'Gioi thieu', href: '/member/referral', icon: <Users size={20} /> },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  ctv: 'CTV Panel', agency: 'Dai ly', admin: 'Admin', member: 'Thanh vien',
};

function readLS(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(key) || fallback;
}

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navByRole[role] || navByRole.admin;

  const [expanded, setExpanded] = useState(() => readLS('sidebar-expanded', 'false') === 'true');
  const [dark, setDark] = useState(() => readLS('theme', 'light') === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    let mounted = true;
    const fn = async () => {
      try { const d = await api.notifications(1, true); if (mounted) setUnreadCount(d.unreadCount || 0); } catch {}
    };
    fn();
    const interval = setInterval(fn, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const toggleExpand = useCallback(() => {
    setExpanded(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-expanded', String(next));
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { expanded: next } }));
      return next;
    });
  }, []);

  const toggleDark = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const navLink = (item: NavItem, isMobile: boolean) => {
    const active = pathname === item.href || pathname?.startsWith(item.href + '/');
    const showLabel = isMobile || expanded;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => isMobile && setMobileOpen(false)}
        className={`${showLabel ? 'px-3 py-2.5 flex items-center gap-3' : 'w-12 h-12 flex items-center justify-center'} rounded-xl text-sm font-medium`}
        style={{
          background: active ? 'var(--sidebar-active-bg)' : undefined,
          color: active ? '#fff' : 'var(--sidebar-foreground)',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--sidebar-active-bg)' : 'transparent'; }}
        title={!showLabel ? item.label : undefined}
      >
        <span className="shrink-0">{item.icon}</span>
        {showLabel && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const bellLink = (isMobile: boolean) => {
    const active = pathname?.includes('/notifications');
    const showLabel = isMobile || expanded;
    return (
      <Link
        href={`/${role}/notifications`}
        onClick={() => isMobile && setMobileOpen(false)}
        className={`${showLabel ? 'px-3 py-2.5 flex items-center gap-3' : 'w-12 h-12 flex items-center justify-center'} rounded-xl text-sm font-medium relative`}
        style={{
          background: active ? 'var(--sidebar-active-bg)' : undefined,
          color: active ? '#fff' : 'var(--sidebar-foreground)',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--sidebar-active-bg)' : 'transparent'; }}
      >
        <span className="shrink-0 relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </span>
        {showLabel && <span className="truncate">Thong bao</span>}
      </Link>
    );
  };

  const themeBtn = (isMobile: boolean) => {
    const showLabel = isMobile || expanded;
    return (
      <button
        onClick={toggleDark}
        className={`${showLabel ? 'px-3 py-2.5 flex items-center gap-3 w-full' : 'w-12 h-12 flex items-center justify-center'} rounded-xl text-sm font-medium`}
        style={{ color: 'var(--sidebar-foreground)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title={!showLabel ? (dark ? 'Light mode' : 'Dark mode') : undefined}
      >
        {dark ? <Sun size={20} /> : <Moon size={20} />}
        {showLabel && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
      </button>
    );
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center bg-card border border-border shadow-sm"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setMobileOpen(false)} />}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-72 flex flex-col z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg"><span className="text-white font-bold text-sm">C</span></div>
            <div><p className="text-white font-bold text-sm">CCB Mart</p><p className="text-[11px]" style={{ color: 'var(--sidebar-foreground)' }}>{ROLE_LABELS[role]}</p></div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto">
          {items.map(item => navLink(item, true))}
          {bellLink(true)}
        </nav>
        <div className="px-3 py-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {themeBtn(true)}
          <button onClick={handleLogout} className="px-3 py-2.5 rounded-xl flex items-center gap-3 w-full text-red-400"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          ><LogOut size={18} /><span className="text-sm font-medium">Dang xuat</span></button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full ${expanded ? 'w-56' : 'w-16'} flex-col z-40 transition-[width] duration-300`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className={`flex items-center ${expanded ? 'px-4 justify-between' : 'justify-center'} h-16`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shrink-0"><span className="text-white font-bold text-sm">C</span></div>
            {expanded && <div><p className="text-white font-bold text-sm">CCB Mart</p><p className="text-[11px]" style={{ color: 'var(--sidebar-foreground)' }}>{ROLE_LABELS[role]}</p></div>}
          </div>
          {expanded && <button onClick={toggleExpand} className="text-gray-500 hover:text-white"><ChevronLeft size={18} /></button>}
        </div>

        <nav className={`flex-1 flex flex-col ${expanded ? 'px-3' : 'items-center'} gap-1 py-2 overflow-y-auto`}>
          {items.map(item => navLink(item, false))}
          {bellLink(false)}
        </nav>

        <div className={`${expanded ? 'px-3' : ''} py-3 flex flex-col ${expanded ? '' : 'items-center'} gap-1`} style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {themeBtn(false)}
          {!expanded && (
            <button onClick={toggleExpand} className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ color: 'var(--sidebar-foreground)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              title="Mo rong"
            ><ChevronRight size={20} /></button>
          )}
          <div className={`flex ${expanded ? 'items-center gap-3 px-3 py-2' : 'flex-col items-center gap-1'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold shrink-0">{role[0]?.toUpperCase()}</div>
            {expanded && <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{ROLE_LABELS[role]}</p></div>}
            <button onClick={handleLogout} className={`${expanded ? '' : 'w-12 h-12'} rounded-xl flex items-center justify-center`} style={{ color: 'var(--sidebar-foreground)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-foreground)'; }}
              title="Dang xuat"
            ><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
    </>
  );
}
