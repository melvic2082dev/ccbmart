'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse,
  Settings, FileText, LogOut, Building2, Bell,
  PlusCircle, Banknote, ClipboardCheck, Wallet, Award, CreditCard
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
    { label: 'Nap tien', href: '/admin/membership/deposits', icon: <CreditCard size={20} /> },
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

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const items = navByRole[role] || navByRole.admin;

  useEffect(() => {
    const fn = async () => {
      try { const d = await api.notifications(1, true); setUnreadCount(d.unreadCount || 0); } catch {}
    };
    fn();
    const interval = setInterval(fn, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-4 z-50"
      style={{ background: '#0f172a' }}
    >
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-8 shadow-lg">
        <span className="text-white font-bold text-sm">C</span>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                active
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={active ? { background: '#334155' } : undefined}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#1e293b'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              title={item.label}
            >
              {item.icon}
            </Link>
          );
        })}

        {/* Bell */}
        <Link
          href={`/${role}/notifications`}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
            pathname?.includes('/notifications') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
          style={pathname?.includes('/notifications') ? { background: '#334155' } : undefined}
          onMouseEnter={(e) => { if (!pathname?.includes('/notifications')) e.currentTarget.style.background = '#1e293b'; }}
          onMouseLeave={(e) => { if (!pathname?.includes('/notifications')) e.currentTarget.style.background = 'transparent'; }}
          title="Thong bao"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </nav>

      {/* Bottom: avatar + logout */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold">
          {role[0]?.toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-400 transition-all duration-200"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          title="Dang xuat"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
