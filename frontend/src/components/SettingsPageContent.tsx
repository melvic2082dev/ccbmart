'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/permissions';
import {
  Settings as SettingsIcon, User, Shield, Bell, Palette, Banknote,
  HelpCircle, FileText, Info, LogOut, ChevronRight,
} from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  rank?: string | null;
}

interface NotifPrefs {
  push: boolean;
  email: boolean;
  sms: boolean;
  transactionsAlert: boolean;
  commissionAlert: boolean;
  trainingAlert: boolean;
  promotionAlert: boolean;
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  push: true, email: true, sms: false,
  transactionsAlert: true, commissionAlert: true,
  trainingAlert: true, promotionAlert: false,
};

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'V13.4';

export default function SettingsPageContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notif, setNotif] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
      const np = localStorage.getItem('notif-prefs');
      if (np) setNotif({ ...DEFAULT_NOTIF_PREFS, ...JSON.parse(np) });
      const t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark' || t === 'system') setTheme(t);
    } catch {}
  }, []);

  useEffect(() => {
    if (!savedToast) return;
    const t = setTimeout(() => setSavedToast(null), 2000);
    return () => clearTimeout(t);
  }, [savedToast]);

  const updateNotif = (k: keyof NotifPrefs, v: boolean) => {
    const next = { ...notif, [k]: v };
    setNotif(next);
    try { localStorage.setItem('notif-prefs', JSON.stringify(next)); } catch {}
    setSavedToast('Đã lưu lựa chọn thông báo');
  };

  const handleLogoutAll = () => {
    if (!confirm('Đăng xuất khỏi tất cả thiết bị? Bạn sẽ phải đăng nhập lại trên thiết bị này.')) return;
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch {}
  };

  return (
    <>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <SettingsIcon size={24} className="text-emerald-600" /> Cài đặt
      </h1>

      <div className="space-y-4">
        {/* 1. Hồ sơ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" /> Hồ sơ của tôi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {user ? (
              <>
                <Field label="Họ tên" value={user.name} />
                <Field label="Email" value={user.email} />
                <Field label="Số điện thoại" value={user.phone || '— Chưa cập nhật'} />
                <Field
                  label="Vai trò"
                  value={
                    <span className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                      {user.rank && (
                        <Badge variant="outline" className="text-xs">{user.rank}</Badge>
                      )}
                    </span>
                  }
                />
              </>
            ) : (
              <p className="text-gray-500">Đang tải…</p>
            )}
          </CardContent>
        </Card>

        {/* 2. Bảo mật */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" /> Bảo mật
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow
              title="Đổi mật khẩu"
              description="Cập nhật mật khẩu định kỳ để giữ tài khoản an toàn."
              action={<Badge variant="outline" className="text-xs">Sắp có</Badge>}
              disabled
            />
            <SettingRow
              title="Xác thực 2 lớp (2FA)"
              description="Thêm một lớp bảo vệ qua OTP gửi về SĐT đã đăng ký."
              action={<Badge variant="outline" className="text-xs">Sắp có</Badge>}
              disabled
            />
            <SettingRow
              title="Đăng xuất khỏi tất cả thiết bị"
              description="Hữu ích nếu bạn nghi ngờ tài khoản bị truy cập trái phép."
              action={<ChevronRight className="w-4 h-4 text-gray-400" />}
              onClick={handleLogoutAll}
            />
          </CardContent>
        </Card>

        {/* 3. Thông báo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" /> Thông báo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500 mb-2">Kênh nhận thông báo</p>
            <Toggle label="Thông báo trong ứng dụng (push)" value={notif.push} onChange={(v) => updateNotif('push', v)} />
            <Toggle label="Thông báo qua email" value={notif.email} onChange={(v) => updateNotif('email', v)} />
            <Toggle label="Thông báo qua SMS" value={notif.sms} onChange={(v) => updateNotif('sms', v)} />

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Loại sự kiện</p>
              <Toggle label="Giao dịch / nộp tiền" value={notif.transactionsAlert} onChange={(v) => updateNotif('transactionsAlert', v)} />
              <Toggle label="Hoa hồng & lương" value={notif.commissionAlert} onChange={(v) => updateNotif('commissionAlert', v)} />
              <Toggle label="Đào tạo & deadline 20h" value={notif.trainingAlert} onChange={(v) => updateNotif('trainingAlert', v)} />
              <Toggle label="Marketing / khuyến mãi" value={notif.promotionAlert} onChange={(v) => updateNotif('promotionAlert', v)} />
            </div>
          </CardContent>
        </Card>

        {/* 4. Giao diện */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-600" /> Giao diện
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-800 mb-2">Chế độ hiển thị</p>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      try { localStorage.setItem('theme', t); } catch {}
                      const root = document.documentElement;
                      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                      root.classList.toggle('dark', isDark);
                      setSavedToast('Đã đổi giao diện');
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      theme === t
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-400'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t === 'light' ? 'Sáng' : t === 'dark' ? 'Tối' : 'Theo hệ thống'}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <SettingRow
                title="Ngôn ngữ"
                description="Tiếng Việt (mặc định) — hỗ trợ thêm ngôn ngữ khác sẽ có sau."
                action={<Badge variant="outline" className="text-xs">vi-VN</Badge>}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Tài khoản nhận tiền (chỉ CTV / Agency / HKD) */}
        {user && ['ctv', 'agency'].includes(user.role) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-4 h-4 text-green-600" /> Tài khoản nhận hoa hồng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs text-gray-500">
                Cập nhật tài khoản ngân hàng để nhận hoa hồng và lương. Thông tin này dùng cho khoản chi từ CCB Mart.
              </p>
              <Link
                href={user.role === 'ctv' ? '/ctv/kyc' : '/agency/inventory'}
                className="block rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-200">Mở trang eKYC / Hồ sơ HKD</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Cập nhật CCCD, GPKD, MST và TK ngân hàng tại đó.</p>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 6. Hỗ trợ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-600" /> Hỗ trợ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SettingLink href="tel:1900xxxxx" title="Hotline" description="1900-xxxx (24/7)" />
            <SettingLink href="mailto:support@ccbmart.vn" title="Email hỗ trợ" description="support@ccbmart.vn" />
            <SettingRow
              title="Câu hỏi thường gặp (FAQ)"
              description="Hướng dẫn sử dụng, quy chế hoa hồng, KPI, đào tạo."
              action={<Badge variant="outline" className="text-xs">Sắp có</Badge>}
              disabled
            />
          </CardContent>
        </Card>

        {/* 7. Pháp lý */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" /> Pháp lý & chính sách
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SettingRow title="Điều khoản sử dụng" action={<Badge variant="outline" className="text-xs">Sắp có</Badge>} disabled />
            <SettingRow title="Chính sách bảo mật" action={<Badge variant="outline" className="text-xs">Sắp có</Badge>} disabled />
            <SettingRow title="Quy chế hoa hồng V13.4" action={<Badge variant="outline" className="text-xs">Sắp có</Badge>} disabled />
          </CardContent>
        </Card>

        {/* 8. Về ứng dụng */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-600" /> Về ứng dụng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Tên ứng dụng" value="CCB Mart — X-WISE" />
            <Field label="Phiên bản" value={APP_VERSION} />
            <Field label="Build" value={process.env.NEXT_PUBLIC_BUILD_TIME || 'dev'} />
          </CardContent>
        </Card>

        <div className="py-4">
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={handleLogoutAll}
          >
            <LogOut className="w-4 h-4 mr-2" /> Đăng xuất khỏi tất cả thiết bị
          </Button>
        </div>
      </div>

      {/* Toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 shadow-lg">
          {savedToast}
        </div>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-1">
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-right text-gray-900 dark:text-gray-100 font-medium">{value}</span>
    </div>
  );
}

function SettingRow({
  title, description, action, onClick, disabled,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left flex items-start justify-between gap-3 rounded-lg px-3 py-2 ${
        onClick && !disabled
          ? 'hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer'
          : disabled ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{title}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0 mt-0.5">{action}</div>}
    </Wrapper>
  );
}

function SettingLink({ href, title, description }: { href: string; title: string; description?: string }) {
  return (
    <a
      href={href}
      className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{title}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
    </a>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          value ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}
