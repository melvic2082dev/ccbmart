'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse,
  Settings, FileText, LogOut, Building2, TrendingUp, ChevronLeft, ChevronRight, Bell
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type NavItem = { label: string; href: string; icon: React.ReactNode; badge?: number };

const navByRole: Record<string, { title: string; items: NavItem[] }> = {
  ctv: {
    title: 'CTV Panel',
    items: [
      { label: 'Dashboard', href: '/ctv/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Khach hang', href: '/ctv/customers', icon: <Users size={20} /> },
      { label: 'Giao dich', href: '/ctv/transactions', icon: <ShoppingCart size={20} /> },
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
      { label: 'Quan ly CTV', href: '/admin/ctv', icon: <Users size={20} /> },
      { label: 'Dai ly', href: '/admin/agencies', icon: <Building2 size={20} /> },
      { label: 'Cau hinh', href: '/admin/config', icon: <Settings size={20} /> },
      { label: 'Bao cao', href: '/admin/reports', icon: <FileText size={20} /> },
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
      } catch {
        // Silently fail
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-slate-900 text-white flex flex-col transition-all duration-200`}>
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-emerald-400">CCB Mart</h1>
            <p className="text-xs text-slate-400">{nav.title}</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {nav.items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && item.label}
            </Link>
          );
        })}

        {/* Notifications link */}
        <Link
          href={`/${role}/notifications`}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname?.includes('/notifications')
              ? 'bg-emerald-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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

      <div className="p-2 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-600/20 hover:text-red-400 w-full transition-colors"
        >
          <LogOut size={20} />
          {!collapsed && 'Dang xuat'}
        </button>
      </div>
    </aside>
  );
}
