'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse,
  Settings, FileText, LogOut, Building2, ChevronLeft, ChevronRight, Bell,
  PlusCircle, Banknote, ClipboardCheck, Wallet, Award, CreditCard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type NavItem = { label: string; href: string; icon: React.ReactNode };

const navByRole: Record<string, { title: string; items: NavItem[] }> = {
  ctv: {
    title: 'CTV Panel',
    items: [
      { label: 'Dashboard', href: '/ctv/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Tao don', href: '/ctv/sales/create', icon: <PlusCircle size={20} /> },
      { label: 'Giao dich', href: '/ctv/transactions', icon: <ShoppingCart size={20} /> },
      { label: 'Nop tien mat', href: '/ctv/cash', icon: <Banknote size={20} /> },
      { label: 'Khach hang', href: '/ctv/customers', icon: <Users size={20} /> },
      { label: 'San pham', href: '/ctv/products', icon: <Package size={20} /> },
    ],
  },
  agency: {
    title: 'Dai ly',
    items: [
      { label: 'Dashboard', href: '/agency/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Ton kho', href: '/agency/inventory', icon: <Warehouse size={20} /> },
      { label: 'Giao dich', href: '/agency/transactions', icon: <ShoppingCart size={20} /> },
    ],
  },
  admin: {
    title: 'Admin',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Doi soat', href: '/admin/reconciliation', icon: <ClipboardCheck size={20} /> },
      { label: 'Quan ly CTV', href: '/admin/ctv', icon: <Users size={20} /> },
      { label: 'Dai ly', href: '/admin/agencies', icon: <Building2 size={20} /> },
      { label: 'Thanh vien', href: '/admin/membership/wallets', icon: <Award size={20} /> },
      { label: 'Nap tien TV', href: '/admin/membership/deposits', icon: <CreditCard size={20} /> },
      { label: 'Referral', href: '/admin/membership/referrals', icon: <Users size={20} /> },
      { label: 'Hang the', href: '/admin/membership/tiers', icon: <Wallet size={20} /> },
      { label: 'Cau hinh', href: '/admin/config', icon: <Settings size={20} /> },
      { label: 'Bao cao', href: '/admin/reports', icon: <FileText size={20} /> },
    ],
  },
  member: {
    title: 'Thanh vien',
    items: [
      { label: 'Dashboard', href: '/member/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Nap tien', href: '/member/topup', icon: <Banknote size={20} /> },
      { label: 'Lich su', href: '/member/transactions', icon: <ShoppingCart size={20} /> },
      { label: 'Gioi thieu', href: '/member/referral', icon: <Users size={20} /> },
    ],
  },
};

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const nav = navByRole[role] || navByRole.admin;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await api.notifications(1, true);
        setUnreadCount(data.unreadCount || 0);
      } catch { /* ignore */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-white border-r border-gray-100 text-gray-700 flex flex-col transition-all duration-200`}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-blue-600">CCB Mart</h1>
            <p className="text-xs text-gray-400">{nav.title}</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-700">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {nav.items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && item.label}
            </Link>
          );
        })}

        {/* Notifications */}
        <Link
          href={`/${role}/notifications`}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname?.includes('/notifications') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={collapsed ? 'Thong bao' : undefined}
        >
          <div className="relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {!collapsed && 'Thong bao'}
        </Link>
      </nav>

      <div className="p-2 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={20} />
          {!collapsed && 'Dang xuat'}
        </button>
      </div>
    </aside>
  );
}
