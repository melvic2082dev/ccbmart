'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LayoutGrid, MapPin, Phone, Search, ShoppingCart, Truck, UserRound } from 'lucide-react';
import { getDashboardHref } from '@/lib/permissions';
import { CATEGORIES } from './categories';

export function Header({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [dashboardHref, setDashboardHref] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        const user = JSON.parse(userData);
        if (user?.role) setDashboardHref(getDashboardHref(user.role));
      }
    } catch { /* ignore */ }
  }, []);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Top 7 categories shown inline; full list still reachable via "Danh mục" button
  const navCats = CATEGORIES.slice(0, 7);

  return (
    <>
      {/* Top utility bar */}
      <div style={{ background: 'var(--ccb-olive-dark)', color: '#E8E4D4', fontSize: 12 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '8px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Phone size={12} /> Hotline: 1900 6868
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Truck size={12} /> Miễn phí giao hàng đơn trên 300.000 ₫
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/stores" style={{ color: 'inherit' }}>Hệ thống cửa hàng</Link>
            <Link href="/about" style={{ color: 'inherit' }}>Về CCB Mart</Link>
            <a href="#" style={{ color: 'inherit' }}>Hỗ trợ</a>
          </div>
        </div>
      </div>

      {/* Flag stripe */}
      <div className="ccb-stripe" />

      {/* Sticky main header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: scrolled ? 'rgba(251,247,238,0.92)' : 'var(--paper-0)',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        borderBottom: '1px solid var(--line)',
        transition: 'background .2s ease-out',
      }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <Image
              src="/ccb-mart-logo.png"
              alt="CCB Mart"
              width={290}
              height={40}
              priority
              style={{ height: 40, width: 'auto', display: 'block' }}
            />
          </Link>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 560, position: 'relative', minWidth: 0 }}>
            <Search size={18} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--ink-3)', pointerEvents: 'none',
            }} />
            <input
              type="search"
              placeholder="Tìm gạo, nước mắm, trà Shan Tuyết…"
              style={{
                width: '100%',
                padding: '11px 14px 11px 42px',
                border: '1px solid var(--line-strong)', borderRadius: 6,
                background: '#FFFFFF', color: 'var(--ink-1)',
              }}
            />
          </div>

          {/* Right-side nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <IconNavLink href="/stores" icon={<MapPin size={20} />} label="Cửa hàng" active={isActive('/stores')} />
            <IconNavLink href="/cart" icon={<ShoppingCart size={20} />} label="Giỏ hàng" badge={cartCount} active={isActive('/cart')} />
            <Link
              href={dashboardHref ?? '/login'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--ccb-red)', color: '#FFF8E7',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
                padding: '10px 16px', borderRadius: 4, border: '1px solid var(--ccb-red)',
                whiteSpace: 'nowrap',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {dashboardHref ? <LayoutDashboard size={16} /> : <UserRound size={16} />}
              {dashboardHref ? 'Vào hệ thống quản lý' : 'Đăng nhập / Đăng ký'}
            </Link>
          </nav>
        </div>

        {/* Category bar */}
        <div style={{ borderTop: '1px solid var(--line)', background: 'var(--paper-0)' }}>
          <div style={{ maxWidth: 1600, margin: '0 auto', padding: '10px 24px',
            display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--ccb-red)', color: '#FFF8E7',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
              padding: '8px 14px', borderRadius: 4, border: 'none', cursor: 'pointer',
              marginRight: 8,
            }}>
              <LayoutGrid size={16} />
              Danh mục
            </button>
            {navCats.map((c) => {
              const href = `/category/${c.slug}`;
              const active = isActive(href);
              return (
                <Link
                  key={c.slug}
                  href={href}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--ccb-red)' : 'var(--ink-2)',
                    background: active ? 'var(--ccb-red-tint)' : 'transparent',
                    padding: '8px 12px', borderRadius: 4,
                  }}
                >{c.name}</Link>
              );
            })}
          </div>
        </div>
      </header>
    </>
  );
}

function IconNavLink({ href, icon, label, badge = 0, active = false }: {
  href: string; icon: React.ReactNode; label: string; badge?: number; active?: boolean;
}) {
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 4, position: 'relative',
      background: active ? 'var(--ccb-red-tint)' : 'transparent',
      color: active ? 'var(--ccb-red)' : 'var(--ink-1)',
      fontFamily: 'var(--font-body)', fontSize: 13,
      fontWeight: active ? 700 : 500,
    }}>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        {icon}
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -8,
            background: 'var(--ccb-red)', color: '#FFF8E7',
            fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
            padding: '0 4px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{badge}</span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}
