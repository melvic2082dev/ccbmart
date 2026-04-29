'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse,
  Settings, FileText, LogOut, Building2, Bell,
  PlusCircle, Banknote, ClipboardCheck, Wallet, Award, CreditCard,
  ChevronLeft, ChevronRight, Sun, Moon, Menu, X, FileSpreadsheet,
  GraduationCap, BookOpen, ShieldCheck, Calculator, FileBarChart, Receipt,
  Coins, Network, UserCog, Layout
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { canAccessMenu, ROLE_LABELS, getRoleGroup, isAdminRole } from '@/lib/permissions';

type AccentKey = 'emerald' | 'green' | 'indigo' | 'amber' | 'sky' | 'violet' | 'cyan' | 'teal' | 'purple' | 'orange' | 'rose' | 'fuchsia' | 'lime' | 'blue';

// Tailwind needs literal class names — keep this map exhaustive.
const ACCENT_ICON: Record<AccentKey, string> = {
  emerald: 'text-emerald-500',
  green:   'text-green-500',
  indigo:  'text-indigo-500',
  amber:   'text-amber-500',
  sky:     'text-sky-500',
  violet:  'text-violet-500',
  cyan:    'text-cyan-500',
  teal:    'text-teal-500',
  purple:  'text-purple-500',
  orange:  'text-orange-500',
  rose:    'text-rose-500',
  fuchsia: 'text-fuchsia-500',
  lime:    'text-lime-500',
  blue:    'text-blue-500',
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  accent?: AccentKey;
  /** If true, renders Bell icon with unread-count badge (used for "Thông báo") */
  isNotificationLink?: boolean;
};
type NavGroup = { title: string; items: NavItem[] };

// Admin: grouped sidebar (6 groups, Vietnamese labels)
const adminGroups: NavGroup[] = [
  {
    title: 'Vận hành',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard',      icon: <LayoutDashboard size={20} />, accent: 'emerald' },
      { label: 'Đối soát',  href: '/admin/reconciliation', icon: <ClipboardCheck size={20} />,  accent: 'cyan'    },
    ],
  },
  {
    title: 'Nhân sự & đối tác',
    items: [
      { label: 'CTV',      href: '/admin/ctv',                icon: <Users size={20} />,    accent: 'sky'    },
      { label: 'Đại lý',   href: '/admin/agencies',           icon: <Building2 size={20} />, accent: 'blue'   },
      { label: 'HKD',      href: '/admin/business-household', icon: <Building2 size={20} />, accent: 'indigo' },
      { label: 'Team vượt cấp', href: '/admin/breakaway-logs', icon: <Network size={20} />,  accent: 'orange' },
    ],
  },
  {
    title: 'Thành viên',
    items: [
      { label: 'Thành viên',  href: '/admin/membership/wallets',  icon: <Award size={20} />,      accent: 'violet'  },
      { label: 'Nạp tiền TV', href: '/admin/membership/deposits', icon: <CreditCard size={20} />, accent: 'fuchsia' },
      { label: 'Hạng thẻ',    href: '/admin/membership/tiers',    icon: <Wallet size={20} />,     accent: 'purple'  },
    ],
  },
  {
    title: 'Đào tạo & phí',
    items: [
      { label: 'Bậc K-factor',       href: '/admin/fee-config',      icon: <GraduationCap size={20} />, accent: 'lime'    },
      { label: 'Log đào tạo',        href: '/admin/training-logs',   icon: <BookOpen size={20} />,      accent: 'green'   },
      { label: 'Phí quản lý',        href: '/admin/management-fees', icon: <Coins size={20} />,         accent: 'amber'   },
      { label: 'Báo cáo lương cứng', href: '/admin/salary-report',   icon: <Wallet size={20} />,        accent: 'teal'    },
    ],
  },
  {
    title: 'Tài chính & thuế',
    items: [
      { label: 'Hóa đơn',            href: '/admin/invoices',     icon: <Receipt size={20} />,    accent: 'teal'    },
      { label: 'Nhật ký thanh toán', href: '/admin/payment-logs', icon: <Banknote size={20} />,   accent: 'amber'   },
      { label: 'Thuế TNCN',          href: '/admin/tax',          icon: <Calculator size={20} />, accent: 'rose'    },
    ],
  },
  {
    title: 'Cấu hình & báo cáo',
    items: [
      { label: 'eKYC',         href: '/admin/kyc',           icon: <ShieldCheck size={20} />,      accent: 'cyan'    },
      { label: 'Import',       href: '/admin/import',        icon: <FileSpreadsheet size={20} />,  accent: 'lime'    },
      { label: 'Cấu hình',     href: '/admin/config',        icon: <Settings size={20} />,         accent: 'violet'  },
      { label: 'Trang chủ CMS', href: '/admin/landing-cms',  icon: <Layout size={20} />,           accent: 'green'   },
      { label: 'Báo cáo',      href: '/admin/reports',       icon: <FileText size={20} />,         accent: 'rose'    },
      { label: 'Thông báo',    href: '/admin/notifications', icon: <Bell size={20} />, isNotificationLink: true, accent: 'orange' },
    ],
  },
  {
    title: 'Quản trị hệ thống',
    items: [
      { label: 'Người dùng', href: '/admin/users', icon: <UserCog size={20} />, accent: 'fuchsia' },
      { label: 'Cài đặt',    href: '/admin/settings', icon: <Settings size={20} />, accent: 'sky' },
    ],
  },
];

function filterAdminGroupsByRole(groups: NavGroup[], role: string): NavGroup[] {
  return groups
    .map(g => ({ ...g, items: g.items.filter(it => canAccessMenu(role, it.href)) }))
    .filter(g => g.items.length > 0);
}

const navByRole: Record<string, NavItem[]> = {
  ctv: [
    { label: 'Dashboard',      href: '/ctv/dashboard',        icon: <LayoutDashboard size={20} />, accent: 'emerald' },
    { label: 'Tạo đơn',        href: '/ctv/sales/create',     icon: <PlusCircle size={20} />,     accent: 'green'   },
    { label: 'Giao dịch',      href: '/ctv/transactions',     icon: <ShoppingCart size={20} />,   accent: 'indigo'  },
    { label: 'Nộp tiền',       href: '/ctv/cash',             icon: <Banknote size={20} />,       accent: 'amber'   },
    { label: 'Khách hàng',     href: '/ctv/customers',        icon: <Users size={20} />,          accent: 'sky'     },
    { label: 'Sản phẩm',       href: '/ctv/products',         icon: <Package size={20} />,        accent: 'violet'  },
    { label: 'eKYC',           href: '/ctv/kyc',              icon: <ShieldCheck size={20} />,    accent: 'cyan'    },
    { label: 'Hóa đơn',        href: '/ctv/invoices',         icon: <Receipt size={20} />,        accent: 'teal'    },
    { label: 'Phí quản lý',    href: '/ctv/management-fees',  icon: <Coins size={20} />,          accent: 'purple'  },
    { label: 'Phí thoát ly',   href: '/ctv/breakaway-fees',   icon: <Network size={20} />,        accent: 'orange'  },
    { label: 'Báo cáo tháng',  href: '/ctv/monthly-report',   icon: <FileBarChart size={20} />,   accent: 'rose'    },
    { label: 'Cài đặt',        href: '/ctv/settings',         icon: <Settings size={20} />,       accent: 'fuchsia' },
  ],
  agency: [
    { label: 'Dashboard', href: '/agency/dashboard',    icon: <LayoutDashboard size={20} />, accent: 'emerald' },
    { label: 'Tồn kho',   href: '/agency/inventory',    icon: <Warehouse size={20} />,       accent: 'amber'   },
    { label: 'Giao dịch', href: '/agency/transactions', icon: <ShoppingCart size={20} />,    accent: 'indigo'  },
    { label: 'Cài đặt',   href: '/agency/settings',     icon: <Settings size={20} />,        accent: 'fuchsia' },
  ],
  // Admin is handled via adminGroups (grouped)
  admin: [],
  member: [
    { label: 'Dashboard',   href: '/member/dashboard',    icon: <LayoutDashboard size={20} />, accent: 'emerald' },
    { label: 'Nạp tiền',    href: '/member/topup',        icon: <Banknote size={20} />,        accent: 'amber'   },
    { label: 'Lịch sử',     href: '/member/transactions', icon: <ShoppingCart size={20} />,    accent: 'indigo'  },
    { label: 'Giới thiệu',  href: '/member/referral',     icon: <Users size={20} />,           accent: 'sky'     },
    { label: 'Cài đặt',     href: '/member/settings',     icon: <Settings size={20} />,        accent: 'fuchsia' },
  ],
};

// ROLE_LABELS imported from @/lib/permissions


// Read from localStorage synchronously to prevent flash
function readLS(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(key) || fallback;
}

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const isAdmin = isAdminRole(role);
  const sidebarRoleKey = isAdmin ? 'admin' : (getRoleGroup(role) || role);
  const items = navByRole[sidebarRoleKey] || [];
  const visibleAdminGroups = isAdmin ? filterAdminGroupsByRole(adminGroups, role) : adminGroups;

  // Initialize synchronously from localStorage - NO useEffect flash
  const [expanded, setExpanded] = useState(() => readLS('sidebar-expanded', 'false') === 'true');
  const [dark, setDark] = useState(() => readLS('theme', 'light') === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Apply dark class on mount (synchronous read already done above)
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  // Persist `expanded` + notify layout — runs AFTER render, not during state updater
  // (dispatching events inside a setState updater triggers setState-in-render warnings)
  const isFirstExpandRender = useRef(true);
  useEffect(() => {
    if (isFirstExpandRender.current) {
      isFirstExpandRender.current = false;
      return;
    }
    localStorage.setItem('sidebar-expanded', String(expanded));
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { expanded } }));
  }, [expanded]);

  // Close mobile drawer on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset side-effect on nav
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Poll notifications
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
    setExpanded(prev => !prev);
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
        className={`${showLabel ? 'px-3 py-2.5 flex items-center gap-3' : 'w-12 h-12 flex items-center justify-center'} rounded-xl text-sm font-medium relative`}
        style={{
          background: active ? 'var(--sidebar-active-bg)' : undefined,
          color: active ? '#fff' : 'var(--sidebar-foreground)',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--sidebar-active-bg)' : 'transparent'; }}
        title={!showLabel ? item.label : undefined}
      >
        <span className={`shrink-0 relative ${!active && item.accent ? ACCENT_ICON[item.accent] : ''}`}>
          {item.icon}
          {item.isNotificationLink && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        {showLabel && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  // Bell link kept for non-admin roles (admin has Thông báo inside group 6)
  const bellLink = (isMobile: boolean) => {
    const active = pathname?.includes('/notifications');
    const showLabel = isMobile || expanded;
    return (
      <Link
        key="bell"
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
        {showLabel && <span className="truncate">Thông báo</span>}
      </Link>
    );
  };

  const groupTitle = (title: string) => (
    <p
      key={`g-${title}`}
      className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: 'var(--sidebar-foreground)', opacity: 0.55 }}
    >
      {title}
    </p>
  );
  const groupDivider = () => (
    <div
      className="my-2 mx-auto w-8 h-px"
      style={{ background: 'var(--sidebar-border)' }}
    />
  );

  const renderNav = (isMobile: boolean) => {
    const showLabel = isMobile || expanded;
    if (isAdmin) {
      return visibleAdminGroups.flatMap((g, gIdx) => {
        const header = showLabel
          ? [groupTitle(g.title)]
          : gIdx > 0 ? [<div key={`d-${gIdx}`}>{groupDivider()}</div>] : [];
        return [...header, ...g.items.map(it => navLink(it, isMobile))];
      });
    }
    return [...items.map(it => navLink(it, isMobile)), bellLink(isMobile)];
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
          {renderNav(true)}
        </nav>
        <div className="px-3 py-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {themeBtn(true)}
          <button onClick={handleLogout} className="px-3 py-2.5 rounded-xl flex items-center gap-3 w-full text-red-400"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          ><LogOut size={18} /><span className="text-sm font-medium">Đăng xuất</span></button>
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
          {renderNav(false)}
        </nav>

        <div className={`${expanded ? 'px-3' : ''} py-3 flex flex-col ${expanded ? '' : 'items-center'} gap-1`} style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {themeBtn(false)}
          {!expanded && (
            <button onClick={toggleExpand} className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ color: 'var(--sidebar-foreground)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              title="Mở rộng"
            ><ChevronRight size={20} /></button>
          )}
          <div className={`flex ${expanded ? 'items-center gap-3 px-3 py-2' : 'flex-col items-center gap-1'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold shrink-0">{role[0]?.toUpperCase()}</div>
            {expanded && <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{ROLE_LABELS[role]}</p></div>}
            <button onClick={handleLogout} className={`${expanded ? '' : 'w-12 h-12'} rounded-xl flex items-center justify-center`} style={{ color: 'var(--sidebar-foreground)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-foreground)'; }}
              title="Đăng xuất"
            ><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
    </>
  );
}
