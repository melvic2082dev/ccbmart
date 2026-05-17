'use client';

import { useEffect, useRef, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export interface CtvRow {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  rank: string;
  parentName?: string | null;
  parentId?: number | null;
  f1Count: number;
  transactionCount: number;
  customerCount: number;
  status: string;
  isActive: boolean;
  currentMonthTrainingHours?: number;
  requiredTrainingHours?: number;
  // v3.4: per-user "lương cứng" toggle
  fixedSalaryEnabled?: boolean;
  fixedSalaryStartDate?: string | null;
  // v3.4: HR profile
  bio?: string | null;
  birthYear?: number | null;
  avatarUrl?: string | null;
  // Multi-role: CTV kiêm Member
  isMember?: boolean;
  memberWallet?: {
    tier: string;
    balance: number;
    points: number;
    totalSpent: number;
    referralCode: string;
  } | null;
}

// Default rank-based fixed salary for display purposes only — backend is the
// source of truth. Keep in sync with COMMISSION_RATES in services/commission.js.
export const RANK_FIXED_SALARY: Record<string, number> = {
  CTV:  0,
  PP:   5_000_000,
  TP:   10_000_000,
  GDV:  18_000_000,
  GDKD: 30_000_000,
};

const RANKS = ['CTV', 'PP', 'TP', 'GDV', 'GDKD'];
const RANK_LABEL: Record<string, string> = {
  CTV: 'CTV', PP: 'PP', TP: 'TP', GDV: 'GĐV', GDKD: 'GĐKD',
};

// Preset reasons for rank change / reassign (P1.3)
export const RANK_CHANGE_REASONS = [
  'Đạt KPI → Fast-Track',
  'Không đạt KPI → Down-rank tự động',
  'Tái cấu trúc đội nhóm',
  'Theo yêu cầu của CTV',
  'Khác (nhập tay)',
];

export const REASSIGN_REASONS = [
  'Đạt KPI → Fast-Track',
  'Không đạt KPI → Down-rank tự động',
  'Tái cấu trúc đội nhóm',
  'Theo yêu cầu của CTV',
  'Khác (nhập tay)',
];

// Combine dropdown + custom text into a single reason string
function composeReason(preset: string, custom: string): string {
  if (preset === 'Khác (nhập tay)') return custom.trim();
  return custom.trim() ? `${preset} — ${custom.trim()}` : preset;
}

// ============================================================
// Modal: Change rank
// ============================================================
export function RankChangeModal({
  open, onOpenChange, ctv, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctv: CtvRow | null;
  onSuccess: () => void;
}) {
  const [newRank, setNewRank] = useState('CTV');
  const [presetReason, setPresetReason] = useState(RANK_CHANGE_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [salaryEnabled, setSalaryEnabled] = useState(true);
  const [salaryStartDate, setSalaryStartDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctv) {
      setNewRank(ctv.rank || 'CTV');
      setPresetReason(RANK_CHANGE_REASONS[0]);
      setCustomReason('');
      // Default salary state: inherit current user setting
      setSalaryEnabled(ctv.fixedSalaryEnabled !== false);
      setSalaryStartDate(ctv.fixedSalaryStartDate ? ctv.fixedSalaryStartDate.slice(0, 10) : '');
      setError(null);
    }
  }, [ctv]);

  if (!ctv) return null;

  const rankSalary = RANK_FIXED_SALARY[newRank] || 0;
  const showSalaryToggle = rankSalary > 0; // CTV không có lương cứng → không cần hiển thị

  const submit = async () => {
    if (newRank === ctv.rank) {
      setError('Rank mới phải khác rank hiện tại');
      return;
    }
    if (presetReason === 'Khác (nhập tay)' && !customReason.trim()) {
      setError('Vui lòng nhập lý do khi chọn "Khác"');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const salary = showSalaryToggle
        ? {
            fixedSalaryEnabled: salaryEnabled,
            fixedSalaryStartDate: salaryEnabled && salaryStartDate ? salaryStartDate : null,
          }
        : undefined;
      await api.adminCtvChangeRank(ctv.id, newRank, composeReason(presetReason, customReason), salary);
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thay đổi cấp bậc</DialogTitle>
          <DialogDescription>
            {ctv.name} · Rank hiện tại: <b>{RANK_LABEL[ctv.rank] ?? ctv.rank}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="newRank">Rank mới</Label>
            <select
              id="newRank"
              value={newRank}
              onChange={(e) => setNewRank(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {RANKS.map(r => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="preset-reason">Lý do</Label>
            <select
              id="preset-reason"
              value={presetReason}
              onChange={(e) => setPresetReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {RANK_CHANGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
              placeholder={
                presetReason === 'Khác (nhập tay)'
                  ? 'Bắt buộc nhập chi tiết…'
                  : 'Ghi chú chi tiết (tuỳ chọn)'
              }
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {showSalaryToggle && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="text-sm font-medium">
                Lương cứng mặc định cho {RANK_LABEL[newRank]}:{' '}
                <span className="font-bold">{rankSalary.toLocaleString('vi-VN')} đ/tháng</span>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={salaryEnabled}
                  onChange={(e) => setSalaryEnabled(e.target.checked)}
                />
                <span>Hưởng lương cứng cho vị trí này</span>
              </label>
              {!salaryEnabled && (
                <p className="text-xs text-amber-700">
                  → Đề bạt trước, chưa hưởng lương. Hoa hồng vẫn tính theo cấp mới.
                </p>
              )}
              {salaryEnabled && (
                <div>
                  <Label className="text-xs">Bắt đầu hưởng lương cứng từ</Label>
                  <input
                    type="date"
                    value={salaryStartDate}
                    onChange={(e) => setSalaryStartDate(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Bỏ trống = áp dụng ngay từ tháng hiện tại.
                  </p>
                </div>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Đang lưu…' : 'Xác nhận'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal: Salary config (chỉ chỉnh lương cứng, không đổi rank)
// ============================================================
export function SalaryConfigModal({
  open, onOpenChange, ctv, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctv: CtvRow | null;
  onSuccess: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctv) {
      setEnabled(ctv.fixedSalaryEnabled !== false);
      setStartDate(ctv.fixedSalaryStartDate ? ctv.fixedSalaryStartDate.slice(0, 10) : '');
      setError(null);
    }
  }, [ctv]);

  if (!ctv) return null;
  const rankSalary = RANK_FIXED_SALARY[ctv.rank] || 0;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.adminCtvSalaryConfig(ctv.id, {
        fixedSalaryEnabled: enabled,
        fixedSalaryStartDate: enabled && startDate ? startDate : null,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tuỳ chọn lương cứng</DialogTitle>
          <DialogDescription>
            {ctv.name} · Rank: <b>{RANK_LABEL[ctv.rank] ?? ctv.rank}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {rankSalary === 0 ? (
            <p className="text-sm text-muted-foreground">
              Vị trí <b>{RANK_LABEL[ctv.rank]}</b> không có lương cứng theo cấu hình hiện tại
              (chỉ hưởng hoa hồng). Tuỳ chọn này chỉ có hiệu lực khi user được thăng cấp.
            </p>
          ) : (
            <div className="text-sm">
              Lương cứng theo cấp: <b>{rankSalary.toLocaleString('vi-VN')} đ/tháng</b>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span>Hưởng lương cứng</span>
          </label>
          {enabled && (
            <div>
              <Label className="text-xs">Bắt đầu hưởng từ</Label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Bỏ trống = áp dụng từ tháng hiện tại.</p>
            </div>
          )}
          {!enabled && (
            <p className="text-xs text-amber-700">
              Đã tắt — user không nhận lương cứng dù rank có. Hoa hồng vẫn tính bình thường.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Đang lưu…' : 'Cập nhật'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal: Reassign parent
// ============================================================
export function ReassignModal({
  open, onOpenChange, ctv, allCtvs, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctv: CtvRow | null;
  allCtvs: CtvRow[];
  onSuccess: () => void;
}) {
  const [newParentId, setNewParentId] = useState<string>('');
  const [presetReason, setPresetReason] = useState(REASSIGN_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctv) {
      setNewParentId(ctv.parentId ? String(ctv.parentId) : '');
      setPresetReason(REASSIGN_REASONS[0]);
      setCustomReason('');
      setError(null);
    }
  }, [ctv]);

  if (!ctv) return null;

  // Candidates: active CTVs, not self, rank higher than current
  const rankOrder = (r: string) => ['CTV', 'PP', 'TP', 'GDV', 'GDKD'].indexOf(r);
  const candidates = allCtvs
    .filter(c => c.id !== ctv.id && c.isActive)
    .filter(c => rankOrder(c.rank) >= rankOrder(ctv.rank))
    .sort((a, b) => rankOrder(b.rank) - rankOrder(a.rank) || a.name.localeCompare(b.name));

  const submit = async () => {
    const parentId = newParentId ? Number(newParentId) : null;
    if (parentId === ctv.parentId) {
      setError('Người quản lý mới phải khác hiện tại');
      return;
    }
    if (presetReason === 'Khác (nhập tay)' && !customReason.trim()) {
      setError('Vui lòng nhập lý do khi chọn "Khác"');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.adminCtvReassign(ctv.id, parentId, composeReason(presetReason, customReason));
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển người quản lý</DialogTitle>
          <DialogDescription>
            {ctv.name} ({RANK_LABEL[ctv.rank]}) · Quản lý hiện tại: <b>{ctv.parentName ?? 'Không có'}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="newParent">Người quản lý mới</Label>
            <select
              id="newParent"
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— Không có (root) —</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  [{RANK_LABEL[c.rank]}] {c.name} · {c.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Chỉ hiện các CTV active có rank ≥ rank hiện tại của {ctv.name}. Backend tự động kiểm tra vòng lặp cây.
            </p>
          </div>
          <div>
            <Label htmlFor="re-preset-reason">Lý do</Label>
            <select
              id="re-preset-reason"
              value={presetReason}
              onChange={(e) => setPresetReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {REASSIGN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
              placeholder={
                presetReason === 'Khác (nhập tay)'
                  ? 'Bắt buộc nhập chi tiết…'
                  : 'Ghi chú chi tiết (tuỳ chọn)'
              }
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Đang lưu…' : 'Xác nhận'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal: Toggle active / inactive
// ============================================================
export function ToggleActiveModal({
  open, onOpenChange, ctv, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctv: CtvRow | null;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (ctv) { setReason(''); setError(null); } }, [ctv]);

  if (!ctv) return null;

  const nextActive = !ctv.isActive;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.adminCtvToggleActive(ctv.id, nextActive, reason);
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{nextActive ? 'Kích hoạt lại CTV' : 'Ngừng hoạt động CTV'}</DialogTitle>
          <DialogDescription>
            {ctv.name} ({RANK_LABEL[ctv.rank]}) · Email: {ctv.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className={`rounded-md border p-3 text-sm ${nextActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {nextActive
              ? 'CTV sẽ được kích hoạt trở lại và có thể đăng nhập, bán hàng bình thường.'
              : 'CTV sẽ KHÔNG thể đăng nhập. Các F1 trực tiếp vẫn giữ nguyên parent cho đến khi admin reassign thủ công.'}
          </div>
          <div>
            <Label htmlFor="toggle-reason">Lý do</Label>
            <textarea
              id="toggle-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={nextActive ? 'VD: Quay lại sau tạm nghỉ' : 'VD: Nghỉ việc / vi phạm kỷ luật / tạm ngưng'}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button
            variant={nextActive ? 'default' : 'destructive'}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Đang lưu…' : (nextActive ? 'Kích hoạt' : 'Ngừng hoạt động')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal: Create CTV
// ============================================================
export function CreateCtvModal({
  open, onOpenChange, allCtvs, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  allCtvs: CtvRow[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', rank: 'CTV', parentId: '', password: 'CCB2026',
    bio: '', birthYear: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', phone: '', rank: 'CTV', parentId: '', password: 'CCB2026', bio: '', birthYear: '' });
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Họ tên và email là bắt buộc');
      return;
    }
    if (form.password.length < 6) { setError('Mật khẩu phải ≥ 6 ký tự'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.adminCtvCreate({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        rank: form.rank,
        parentId: form.parentId ? Number(form.parentId) : null,
        password: form.password,
        bio: form.bio.trim() || undefined,
        birthYear: form.birthYear ? Number(form.birthYear) : undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  const rankOrder = (r: string) => ['CTV', 'PP', 'TP', 'GDV', 'GDKD'].indexOf(r);
  const parentCandidates = allCtvs
    .filter(c => c.isActive && rankOrder(c.rank) >= rankOrder(form.rank))
    .sort((a, b) => rankOrder(b.rank) - rankOrder(a.rank) || a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo CTV mới</DialogTitle>
          <DialogDescription>Tạo tài khoản thủ công cho CTV không tự đăng ký</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="c-name">Họ tên *</Label>
            <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="c-email">Email *</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="c-phone">SĐT</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="c-rank">Rank</Label>
              <select
                id="c-rank"
                value={form.rank}
                onChange={(e) => setForm({ ...form, rank: e.target.value, parentId: '' })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {RANKS.map(r => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="c-password">Mật khẩu</Label>
              <Input id="c-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="c-parent">Người quản lý trực tiếp</Label>
            <select
              id="c-parent"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Không có (root) —</option>
              {parentCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  [{RANK_LABEL[c.rank]}] {c.name} · {c.email}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label htmlFor="c-bio">Mô tả / Kinh nghiệm</Label>
              <textarea
                id="c-bio"
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Ví dụ: kinh nghiệm sales bảo hiểm 6 năm"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="c-year">Năm sinh</Label>
              <Input id="c-year" type="number" min={1900} max={new Date().getFullYear()}
                value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                placeholder="1988"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Đang tạo…' : 'Tạo CTV'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal: Edit CTV profile (name, phone, bio, birthYear)
// ============================================================
export function EditCtvProfileModal({
  open, onOpenChange, ctv, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctv: CtvRow | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', bio: '', birthYear: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctv) {
      setForm({
        name: ctv.name || '',
        phone: ctv.phone || '',
        bio: ctv.bio || '',
        birthYear: ctv.birthYear ? String(ctv.birthYear) : '',
      });
      setError(null);
    }
  }, [ctv]);

  if (!ctv) return null;

  const submit = async () => {
    if (!form.name.trim()) { setError('Họ tên không được để trống'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.adminCtvUpdateProfile(ctv.id, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        bio: form.bio.trim() || null,
        birthYear: form.birthYear ? Number(form.birthYear) : null,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa thông tin nhân sự</DialogTitle>
          <DialogDescription>
            {ctv.email} · Rank: <b>{RANK_LABEL[ctv.rank] ?? ctv.rank}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="e-name">Họ tên *</Label>
            <Input id="e-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label htmlFor="e-phone">SĐT</Label>
              <Input id="e-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="e-year">Năm sinh</Label>
              <Input id="e-year" type="number" min={1900} max={new Date().getFullYear()}
                value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                placeholder="1988"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="e-bio">Mô tả / Kinh nghiệm</Label>
            <textarea
              id="e-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Ví dụ: kinh nghiệm sales bảo hiểm 6 năm"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Đang lưu…' : 'Cập nhật'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal: CTV details (4 tabs)
// ============================================================
interface TrainingSummaryRow {
  month: string;
  hours: number;
  requiredHours: number;
  status: 'OK' | 'SHORT' | 'MISSING';
  consequence: string | null;
}

interface CtvDetailData {
  profile: {
    id: number; name: string; email: string; phone?: string | null; rank: string;
    isActive: boolean; isBusinessHousehold: boolean; kycStatus: string; createdAt: string;
    parent?: { id: number; name: string; rank: string; email: string } | null;
    f1Count: number; transactionCount: number; customerCount: number; totalRevenue: number;
    // v3.4
    bio?: string | null;
    birthYear?: number | null;
    avatarUrl?: string | null;
  };
  kpiLogs: Array<{ id: number; month: string; selfSales: number; portfolioSize: number; rankBefore?: string; rankAfter?: string }>;
  rankHistory: Array<{ id: number; oldRank: string; newRank: string; reason: string; changedBy: string; changedAt: string }>;
  trainingLogs: Array<{
    id: number; sessionDate: string; durationMinutes: number; content: string; status: string;
    trainer?: { name: string; rank: string }; trainee?: { name: string; rank: string };
  }>;
  trainingSummary?: TrainingSummaryRow[];
  trainingAlert?: string | null;
  managementFees: Array<{ id: number; month: string; level: string | number; amount: number; status: string }>;
  memberActivity?: {
    isMember: boolean;
    tier?: string;
    pointsRate?: number;
    balance?: number;
    points?: number;
    referralCode?: string;
    totalDeposited?: number;
    totalSpent?: number;
    deposits?: Array<{ id: number; amount: number; method: string; status: string; reference?: string; createdAt: string; confirmedAt?: string | null }>;
    referralsGiven?: Array<{ id: number; month: string; bonusAmount: number; referee?: { id: number; name: string; email: string } }>;
  };
}

// Format "YYYY-MM" → "MM/YYYY"
function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${m}/${y}`;
}

function TrainingStatusBadge({ status }: { status: TrainingSummaryRow['status'] }) {
  if (status === 'OK') {
    return <Badge className="bg-emerald-100 text-emerald-700 text-xs">✅ Đạt</Badge>;
  }
  if (status === 'SHORT') {
    return <Badge className="bg-amber-100 text-amber-700 text-xs">⚠️ Thiếu</Badge>;
  }
  return <Badge className="bg-red-100 text-red-700 text-xs">❌ Chưa có log</Badge>;
}

export function CtvDetailsModal({
  open, onOpenChange, ctvId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctvId: number | null;
}) {
  const [data, setData] = useState<CtvDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extracted so the avatar upload handler can re-fetch after a successful
  // upload without breaking the load-once effect below.
  const refetch = (id: number) => {
    setLoading(true);
    api.adminCtvDetails(id)
      .then((raw) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = raw as any;
        const reshaped: CtvDetailData = u && u.profile ? (u as CtvDetailData) : {
          profile: {
            id: u?.id,
            name: u?.name ?? '',
            email: u?.email ?? '',
            phone: u?.phone ?? null,
            rank: u?.rank ?? 'CTV',
            isActive: !!u?.isActive,
            isBusinessHousehold: !!u?.isBusinessHousehold,
            kycStatus: u?.kycStatus ?? '—',
            createdAt: u?.createdAt ?? new Date().toISOString(),
            parent: u?.parent ? { id: u.parent.id, name: u.parent.name, rank: u.parent.rank, email: u.parent.email ?? '' } : null,
            f1Count: Array.isArray(u?.children) ? u.children.length : 0,
            transactionCount: u?._count?.transactions ?? 0,
            customerCount: u?._count?.customers ?? 0,
            totalRevenue: 0,
            bio: u?.bio ?? null,
            birthYear: u?.birthYear ?? null,
            avatarUrl: u?.avatarUrl ?? null,
          },
          kpiLogs: Array.isArray(u?.kpiLogs) ? u.kpiLogs : [],
          rankHistory: Array.isArray(u?.rankHistory) ? u.rankHistory : [],
          trainingLogs: Array.isArray(u?.traineeLogs) ? u.traineeLogs : (Array.isArray(u?.trainingLogs) ? u.trainingLogs : []),
          managementFees: Array.isArray(u?.managementFees) ? u.managementFees : [],
        };
        setData(reshaped);
      })
      .catch((err) => console.error('Failed to fetch details:', err))
      .finally(() => setLoading(false));
  };

  const onPickAvatar = async (file: File | null) => {
    if (!file || !ctvId) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      await api.adminCtvUploadAvatar(ctvId, file);
      refetch(ctvId);
    } catch (e) {
      setAvatarError((e as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDeleteAvatar = async () => {
    if (!ctvId) return;
    if (!window.confirm('Xoá avatar?')) return;
    try { await api.adminCtvDeleteAvatar(ctvId); refetch(ctvId); }
    catch (e) { setAvatarError((e as Error).message); }
  };

  useEffect(() => {
    if (!open || !ctvId) return;
    setData(null);
    setAvatarError(null);
    refetch(ctvId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ctvId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words">Chi tiết CTV {data ? `· ${data.profile.name}` : ''}</DialogTitle>
          {data && (
            <DialogDescription className="break-words">
              [{RANK_LABEL[data.profile.rank] ?? data.profile.rank}] {data.profile.email} ·
              {data.profile.isActive ? ' Hoạt động' : ' Dừng'} ·
              KYC: {data.profile.kycStatus}
            </DialogDescription>
          )}
        </DialogHeader>

        {data && (
          <div className="flex items-center gap-4 mt-2 p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30">
            {/* Avatar */}
            <div className="relative">
              {data.profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={api.resolveUploadUrl(data.profile.avatarUrl) || ''}
                  alt={data.profile.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-300"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold">
                  {data.profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white text-xs">…</div>
              )}
            </div>
            {/* Upload buttons */}
            <div className="flex-1 space-y-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
                  {data.profile.avatarUrl ? 'Đổi avatar' : 'Tải ảnh đại diện'}
                </Button>
                {data.profile.avatarUrl && (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={onDeleteAvatar}>Xoá</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG / PNG / WebP / GIF, tối đa 3 MB.</p>
              {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
            </div>
          </div>
        )}

        {loading || !data ? (
          <div className="py-10 text-center text-sm text-gray-400">Đang tải…</div>
        ) : (
          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="flex w-full overflow-x-auto whitespace-nowrap">
              <TabsTrigger value="profile">Thông tin</TabsTrigger>
              <TabsTrigger value="kpi">KPI ({data.kpiLogs.length})</TabsTrigger>
              <TabsTrigger value="rank">Lịch sử rank ({data.rankHistory.length})</TabsTrigger>
              <TabsTrigger value="fees">Phí quản lý ({data.managementFees.length})</TabsTrigger>
              <TabsTrigger value="training">Đào tạo ({data.trainingLogs.length})</TabsTrigger>
              <TabsTrigger value="member">Hoạt động thành viên</TabsTrigger>
            </TabsList>

            {/* Tab 1: Profile */}
            <TabsContent value="profile" className="space-y-3 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Field label="Họ tên" value={data.profile.name} />
                <Field label="Email" value={data.profile.email} />
                <Field label="SĐT" value={data.profile.phone || '—'} />
                <Field label="Rank" value={<Badge className="bg-emerald-100 text-emerald-700 text-xs">{RANK_LABEL[data.profile.rank] ?? data.profile.rank}</Badge>} />
                <Field
                  label="Năm sinh"
                  value={data.profile.birthYear
                    ? `${data.profile.birthYear} (${new Date().getFullYear() - data.profile.birthYear} tuổi)`
                    : '—'}
                />
                <Field label="Người quản lý" value={data.profile.parent ? `${data.profile.parent.name} (${RANK_LABEL[data.profile.parent.rank] ?? data.profile.parent.rank})` : 'Không có (root)'} />
                <Field label="Hộ kinh doanh" value={data.profile.isBusinessHousehold ? 'Có' : 'Không'} />
                <Field label="Ngày tham gia" value={new Date(data.profile.createdAt).toLocaleDateString('vi-VN')} />
                <Field label="Trạng thái" value={data.profile.isActive ? 'Hoạt động' : 'Dừng'} />
              </div>

              {data.profile.bio && (
                <div className="mt-2 pt-3 border-t">
                  <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Mô tả / Kinh nghiệm</p>
                  <p className="text-sm whitespace-pre-line">{data.profile.bio}</p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="F1 trực tiếp" value={data.profile.f1Count} />
                <Stat label="Giao dịch" value={data.profile.transactionCount} />
                <Stat label="Khách hàng" value={data.profile.customerCount} />
                <Stat label="Tổng doanh số" value={formatVND(data.profile.totalRevenue)} small />
              </div>
            </TabsContent>

            {/* Tab 2: KPI */}
            <TabsContent value="kpi" className="pt-4">
              {data.kpiLogs.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Chưa có KPI log</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tháng</TableHead>
                      <TableHead className="text-right">Combo cá nhân</TableHead>
                      <TableHead className="text-right">Portfolio nhóm</TableHead>
                      <TableHead>Rank (trước → sau)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.kpiLogs.map(k => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.month}</TableCell>
                        <TableCell className="text-right">{k.selfSales}</TableCell>
                        <TableCell className="text-right">{k.portfolioSize}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {k.rankBefore ?? '—'} → {k.rankAfter ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tab 3: Rank history */}
            <TabsContent value="rank" className="pt-4">
              {data.rankHistory.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Chưa có thay đổi rank</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Rank cũ → mới</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead>Người thực hiện</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rankHistory.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.changedAt).toLocaleString('vi-VN')}</TableCell>
                        <TableCell>
                          <Badge className="bg-gray-100 text-gray-700 mr-1 text-xs">{RANK_LABEL[r.oldRank] ?? r.oldRank}</Badge>
                          →
                          <Badge className="bg-emerald-100 text-emerald-700 ml-1 text-xs">{RANK_LABEL[r.newRank] ?? r.newRank}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-sm">{r.reason}</TableCell>
                        <TableCell className="text-xs">{r.changedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tab 4: Management fees */}
            <TabsContent value="fees" className="pt-4">
              {data.managementFees.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Chưa có phí quản lý nào</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tháng</TableHead>
                      <TableHead>Cấp (F1/F2/F3)</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.managementFees.map(f => (
                      <TableRow key={f.id}>
                        <TableCell>{f.month}</TableCell>
                        <TableCell><Badge className="bg-blue-100 text-blue-700 text-xs">{f.level}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatVND(f.amount)}</TableCell>
                        <TableCell>
                          <Badge className={
                            f.status === 'paid' ? 'bg-emerald-100 text-emerald-700 text-xs' :
                            f.status === 'pending' ? 'bg-amber-100 text-amber-700 text-xs' :
                            'bg-gray-100 text-gray-700 text-xs'
                          }>{f.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tab 5: Training — summary (20h/month) + recent logs */}
            <TabsContent value="training" className="pt-4 space-y-4">
              {data.trainingAlert && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  <b>⚠️ Cảnh báo:</b> {data.trainingAlert}
                </div>
              )}

              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wide mb-2">
                  Tổng hợp log đào tạo 6 tháng (yêu cầu 20h/tháng)
                </p>
                {!data.trainingSummary || data.trainingSummary.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">Chưa có dữ liệu</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tháng</TableHead>
                        <TableHead className="text-right">Giờ thực tế</TableHead>
                        <TableHead className="text-right">Yêu cầu</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Hậu quả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.trainingSummary.map(s => (
                        <TableRow key={s.month}>
                          <TableCell className="font-medium">{fmtMonth(s.month)}</TableCell>
                          <TableCell className={
                            'text-right font-medium ' +
                            (s.status === 'OK' ? 'text-emerald-700' :
                             s.status === 'SHORT' ? 'text-amber-700' : 'text-red-600')
                          }>
                            {s.hours}h
                          </TableCell>
                          <TableCell className="text-right text-gray-500">{s.requiredHours}h</TableCell>
                          <TableCell><TrainingStatusBadge status={s.status} /></TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-xs">
                            {s.consequence ?? <span className="text-gray-300">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wide mb-2">
                  10 log gần nhất (tất cả trạng thái, bao gồm khi CTV là Trainer/Trainee)
                </p>
                {data.trainingLogs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">Chưa có log đào tạo</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Trainer</TableHead>
                        <TableHead>Trainee</TableHead>
                        <TableHead className="text-right">Phút</TableHead>
                        <TableHead>Nội dung</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.trainingLogs.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{new Date(t.sessionDate).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell className="text-xs">{t.trainer?.name}</TableCell>
                          <TableCell className="text-xs">{t.trainee?.name}</TableCell>
                          <TableCell className="text-right">{t.durationMinutes}</TableCell>
                          <TableCell className="text-xs max-w-xs truncate">{t.content}</TableCell>
                          <TableCell>
                            <Badge className={
                              t.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-amber-100 text-amber-700 text-xs'
                            }>{t.status === 'VERIFIED' ? 'Đã duyệt' : t.status === 'PENDING' ? 'Chờ duyệt' : t.status === 'REJECTED' ? 'Từ chối' : t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Tab 6: Hoạt động thành viên */}
            <TabsContent value="member" className="pt-4 space-y-4">
              {!data.memberActivity?.isMember ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <b>CTV này chưa đăng ký Thành viên.</b>
                  <p className="mt-1 text-xs">
                    Khi CTV đăng ký Thành viên, họ có thể mua hàng cá nhân (tích điểm, ưu đãi) mà không ảnh hưởng
                    tới vai trò bán hàng. Giao dịch bán cho chính mình sẽ bị hệ thống chặn tự động (self-referral guard).
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Hạng thành viên" value={<Badge className="bg-purple-100 text-purple-700 text-xs">{data.memberActivity.tier}</Badge>} small />
                    <Stat label="Số dư ví"       value={formatVND(data.memberActivity.balance ?? 0)} small />
                    <Stat label="Điểm tích luỹ"  value={(data.memberActivity.points ?? 0).toLocaleString('vi-VN')} small />
                    <Stat label="Mã giới thiệu"  value={<span className="font-mono text-sm">{data.memberActivity.referralCode}</span>} small />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Tổng đã nạp"        value={formatVND(data.memberActivity.totalDeposited ?? 0)} small />
                    <Stat label="Tổng chi tiêu cá nhân" value={formatVND(data.memberActivity.totalSpent ?? 0)} small />
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500 tracking-wide mb-2">
                      Lịch sử nạp tiền (10 gần nhất)
                    </p>
                    {!data.memberActivity.deposits || data.memberActivity.deposits.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-400">Chưa có lịch sử nạp tiền</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ngày</TableHead>
                            <TableHead className="text-right">Số tiền</TableHead>
                            <TableHead>Phương thức</TableHead>
                            <TableHead>Mã GD</TableHead>
                            <TableHead>Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.memberActivity.deposits.map(d => (
                            <TableRow key={d.id}>
                              <TableCell className="text-xs">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                              <TableCell className="text-right font-medium">{formatVND(d.amount)}</TableCell>
                              <TableCell className="text-xs">
                                {d.method === 'bank_transfer' ? 'Chuyển khoản'
                                  : d.method === 'cash' ? 'Tiền mặt'
                                  : d.method === 'momo' ? 'Momo'
                                  : d.method === 'zalopay' ? 'ZaloPay' : d.method}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{d.reference || '—'}</TableCell>
                              <TableCell>
                                <Badge className={
                                  d.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 text-xs' :
                                  d.status === 'PENDING'   ? 'bg-amber-100 text-amber-700 text-xs' :
                                  'bg-red-100 text-red-700 text-xs'
                                }>{d.status === 'CONFIRMED' ? 'Đã duyệt' : d.status === 'PENDING' ? 'Chờ duyệt' : d.status === 'REJECTED' ? 'Từ chối' : d.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500 tracking-wide mb-2">
                      Người được giới thiệu (referral, cap 2.000.000đ/tháng, sunset 12 tháng)
                    </p>
                    {!data.memberActivity.referralsGiven || data.memberActivity.referralsGiven.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-400">Chưa có referral</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tháng</TableHead>
                            <TableHead>Người được giới thiệu</TableHead>
                            <TableHead className="text-right">Thưởng</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.memberActivity.referralsGiven.map(r => (
                            <TableRow key={r.id}>
                              <TableCell>{r.month}</TableCell>
                              <TableCell className="text-xs">{r.referee?.name} · {r.referee?.email}</TableCell>
                              <TableCell className="text-right font-medium">{formatVND(r.bonusAmount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase text-gray-400 tracking-wide">{label}</p>
      <p className="font-medium text-gray-800 break-words">{value}</p>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-3">
      <p className="text-xs text-emerald-700 uppercase tracking-wide">{label}</p>
      <p className={small ? 'text-sm font-bold text-gray-800 mt-1' : 'text-lg font-bold text-gray-800 mt-1'}>{value}</p>
    </div>
  );
}

// ============================================================
// Modal: Bulk notification (P2.6)
// ============================================================
export function BulkNotificationModal({
  open, onOpenChange, selectedCtvs, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCtvs: CtvRow[];
  onSuccess: (sent: number) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setTitle(''); setContent(''); setError(null); }
  }, [open]);

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Tiêu đề và nội dung là bắt buộc');
      return;
    }
    if (selectedCtvs.length === 0) {
      setError('Chưa chọn CTV nào');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.adminBulkNotify({
        userIds: selectedCtvs.map(c => c.id),
        title: title.trim(),
        content: content.trim(),
        type: 'ADMIN_BROADCAST',
      }) as { sent: number };
      onSuccess(res.sent ?? selectedCtvs.length);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gửi thông báo hàng loạt</DialogTitle>
          <DialogDescription>
            Gửi cho <b>{selectedCtvs.length}</b> CTV đã chọn
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="max-h-24 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
            {selectedCtvs.slice(0, 20).map(c => (
              <span key={c.id} className="inline-block mr-2 mb-1 rounded bg-white dark:bg-slate-800 border px-1.5 py-0.5">
                {c.name}
              </span>
            ))}
            {selectedCtvs.length > 20 && (
              <span className="italic text-gray-400">… và {selectedCtvs.length - 20} người khác</span>
            )}
          </div>
          <div>
            <Label htmlFor="notif-title">Tiêu đề *</Label>
            <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Thông báo họp tháng 4" />
          </div>
          <div>
            <Label htmlFor="notif-content">Nội dung *</Label>
            <textarea
              id="notif-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Nội dung chi tiết…"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Đang gửi…' : `Gửi cho ${selectedCtvs.length} CTV`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
