'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse,
  Settings, FileText, LogOut, Building2, Bell,
  PlusCircle, Banknote, ClipboardCheck, Wallet, Award, CreditCard,
  ChevronLeft, ChevronRight, Sun, Moon
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
    { label: 'Thanh vien', href: '/admin/membership/wallets', icon: <Award size={20} /> },
    { label: 'Nap tien TV', href: '/admin/membership/deposits', icon: <CreditCard size={20} /> },
    { label: 'Hang the', href: '/admin/membership/tiers', icon: <Wallet size={20} /> },
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

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dark, setDark] = useState(false);
  const items = navByRole[role] || navByRole.admin;

  // Load saved preferences
  useEffect(() => {
    const savedExpanded = localStorage.getItem('sidebar-expanded');
    if (savedExpanded === 'true') setExpanded(true);
    const savedDark = localStorage.getItem('theme');
    if (savedDark === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const fn = async () => {
      try { const d = await api.notifications(1, true); setUnreadCount(d.unreadCount || 0); } catch {}
    };
    fn();
    const interval = setInterval(fn, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem('sidebar-expanded', String(next));
    // Dispatch event so DashboardLayout can react
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { expanded: next } }));
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const sidebarW = expanded ? 'w-56' : 'w-16';
  const mainBg = 'var(--sidebar-bg)';

  return (
    <aside
      className={`fixed left-0 top-0 h-full ${sidebarW} flex flex-col z-50 transition-all duration-300`}
      style={{ background: mainBg }}
    >
      {/* Header: Logo + title (expanded) + toggle */}
      <div className={`flex items-center ${expanded ? 'px-4 justify-between' : 'justify-center'} h-16`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight">CCB Mart</p>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--sidebar-foreground)' }}>{ROLE_LABELS[role]}</p>
            </div>
          )}
        </div>
        {expanded && (
          <button onClick={toggleExpand} className="text-gray-500 hover:text-white transition-colors" title="Thu gon">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 flex flex-col ${expanded ? 'px-3' : 'items-center'} gap-1 py-2 overflow-y-auto`}>
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${expanded ? 'px-3 py-2.5 rounded-xl flex items-center gap-3' : 'w-12 h-12 rounded-xl flex items-center justify-center'} transition-all duration-200 ${
                active ? 'text-white' : 'hover:text-white'
              }`}
              style={{
                background: active ? 'var(--sidebar-active-bg)' : undefined,
                color: active ? '#fff' : 'var(--sidebar-foreground)',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--sidebar-active-bg)' : 'transparent'; }}
              title={!expanded ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {expanded && <span className="text-sm font-medium truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Bell */}
        <Link
          href={`/${role}/notifications`}
          className={`${expanded ? 'px-3 py-2.5 rounded-xl flex items-center gap-3' : 'w-12 h-12 rounded-xl flex items-center justify-center'} transition-all duration-200 relative`}
          style={{
            background: pathname?.includes('/notifications') ? 'var(--sidebar-active-bg)' : undefined,
            color: pathname?.includes('/notifications') ? '#fff' : 'var(--sidebar-foreground)',
          }}
          onMouseEnter={(e) => { if (!pathname?.includes('/notifications')) e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
          onMouseLeave={(e) => { if (!pathname?.includes('/notifications')) e.currentTarget.style.background = pathname?.includes('/notifications') ? 'var(--sidebar-active-bg)' : 'transparent'; }}
          title={!expanded ? 'Thong bao' : undefined}
        >
          <span className="shrink-0 relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          {expanded && <span className="text-sm font-medium">Thong bao</span>}
        </Link>
      </nav>

      {/* Bottom section */}
      <div className={`${expanded ? 'px-3' : ''} py-3 flex flex-col ${expanded ? '' : 'items-center'} gap-1`} style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className={`${expanded ? 'px-3 py-2.5 rounded-xl flex items-center gap-3 w-full' : 'w-12 h-12 rounded-xl flex items-center justify-center'} transition-all duration-200`}
          style={{ color: 'var(--sidebar-foreground)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          title={!expanded ? (dark ? 'Light mode' : 'Dark mode') : undefined}
        >
          <span className="shrink-0">{dark ? <Sun size={20} /> : <Moon size={20} />}</span>
          {expanded && <span className="text-sm font-medium">{dark ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* Expand toggle (collapsed state) */}
        {!expanded && (
          <button
            onClick={toggleExpand}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{ color: 'var(--sidebar-foreground)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="Mo rong sidebar"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* User avatar + logout */}
        <div className={`flex ${expanded ? 'items-center gap-3 px-3 py-2' : 'flex-col items-center gap-1'}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {role[0]?.toUpperCase()}
          </div>
          {expanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{ROLE_LABELS[role]}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`${expanded ? '' : 'w-12 h-12'} rounded-xl flex items-center justify-center transition-all duration-200`}
            style={{ color: 'var(--sidebar-foreground)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-foreground)'; }}
            title="Dang xuat"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
