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
    const fetch = async () => {
      try { const d = await api.notifications(1, true); setUnreadCount(d.unreadCount || 0); } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-100 flex flex-col items-center z-40">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <span className="text-white font-bold text-sm">C</span>
        </div>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150 ${
                active
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title={item.label}
            >
              {item.icon}
            </Link>
          );
        })}

        {/* Notification bell */}
        <Link
          href={`/${role}/notifications`}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150 relative ${
            pathname?.includes('/notifications')
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
          title="Thong bao"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </nav>

      {/* Bottom: logout */}
      <div className="py-4 flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold">
          {role[0]?.toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
          title="Dang xuat"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
