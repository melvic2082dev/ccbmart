'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Wallet, Package, TrendingUp, AlertTriangle, ShoppingCart, Download, ClipboardList,
} from 'lucide-react';

// ============================================================
// Shared types + helpers
// ============================================================
export interface AgencyRow {
  id: number;
  userId: number;
  name: string;
  address: string;
  region: string;
  depositAmount: number;
  depositTier: string;
  rankTier: 'KIM_CUONG' | 'VANG' | 'BAC' | 'DONG';
  user: { id: number; name: string; email: string; phone: string };
  inventoryWarnings: Array<{ id: number; quantity: number; warningType: string; expiryDate: string; product: { name: string } }>;
  warningCount: number;
  lowStockCount: number;
  transactions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  prevMonthlyRev: number;
  last30dRevenue: number;
  last30dTxnCount: number;
  currentInventory: number;
  receivedValue: number;
  soldValue: number;
  creditRemaining: number;
}

export const RANK_TIER_LABEL: Record<string, string> = {
  KIM_CUONG: 'Kim cương',
  VANG: 'Vàng',
  BAC: 'Bạc',
  DONG: 'Đồng',
};

export const RANK_TIER_BADGE: Record<string, string> = {
  KIM_CUONG: 'bg-cyan-100 text-cyan-700 border border-cyan-300',
  VANG: 'bg-amber-100 text-amber-700 border border-amber-300',
  BAC: 'bg-slate-100 text-slate-700 border border-slate-300',
  DONG: 'bg-orange-100 text-orange-700 border border-orange-300',
};

export function AgencyRankBadge({ tier }: { tier: string }) {
  const cls = RANK_TIER_BADGE[tier] ?? 'bg-gray-100 text-gray-700 border border-gray-300';
  return <Badge className={`text-xs px-2 py-0.5 ${cls}`}>{RANK_TIER_LABEL[tier] ?? tier}</Badge>;
}

// ============================================================
// Agency detail modal (Tài chính / Tồn kho / Giao dịch 30d / Đề xuất nhập)
// ============================================================
interface DetailData {
  profile: {
    id: number;
    name: string;
    address: string;
    region: string;
    depositTier: string;
    user: { name: string; email: string; phone: string };
  };
  finance: {
    depositAmount: number;
    receivedValue: number;
    soldValue: number;
    currentInventory: number;
    creditRemaining: number;
    totalRevenue: number;
    monthlyRevenue: number;
    rankTier: string;
  };
  warnings: Array<{ id: number; quantity: number; warningType: string; expiryDate: string; product: { name: string; unit?: string } }>;
  velocity: Array<{ product: { id: number; name: string; unit?: string }; soldQty: number; dailyAvg: number }>;
}

interface TxnRow {
  id: number;
  createdAt: string;
  totalAmount: number;
  cogsAmount: number;
  paymentMethod?: string | null;
  status: string;
  customer?: { name: string; phone: string } | null;
  items: Array<{ quantity: number; product: { name: string; unit?: string } }>;
}

interface RestockSuggestion {
  product: { id: number; name: string; unit?: string };
  soldLast30d: number;
  dailyAvg: number;
  suggestQty: number;
  estimatedCost: number;
}

export function AgencyDetailModal({
  open, onOpenChange, agencyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: number | null;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [txns, setTxns] = useState<TxnRow[] | null>(null);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [suggestions, setSuggestions] = useState<{ suggestions: RestockSuggestion[]; totalEstimate: number } | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!open || !agencyId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching effect
    setLoading(true);
    setData(null);
    setTxns(null);
    setSuggestions(null);
    api.adminAgencyDetails(agencyId)
      .then((d) => { if (!cancelled) setData(d as DetailData); })
      .catch((err) => console.error('Failed to fetch agency details:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, agencyId]);

  const loadTxns = () => {
    if (!agencyId || txns !== null) return;
    setLoadingTxns(true);
    api.adminAgencyTransactions(agencyId, 30)
      .then((d) => setTxns((d as { transactions: TxnRow[] }).transactions))
      .catch((err) => console.error('Failed:', err))
      .finally(() => setLoadingTxns(false));
  };
  const loadSuggestions = () => {
    if (!agencyId || suggestions !== null) return;
    setLoadingSuggestions(true);
    api.adminAgencyRestockSuggestions(agencyId)
      .then((d) => setSuggestions(d as { suggestions: RestockSuggestion[]; totalEstimate: number }))
      .catch((err) => console.error('Failed:', err))
      .finally(() => setLoadingSuggestions(false));
  };

  const downloadTxns = async () => {
    if (!agencyId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api.adminAgencyExportUrl(agencyId, 30), {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agency-${agencyId}-transactions-30d.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Xuất Excel thất bại');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đại lý {data ? `· ${data.profile.name}` : ''}</DialogTitle>
          {data && (
            <DialogDescription>
              {data.profile.address} · Chủ: {data.profile.user.name} ({data.profile.user.phone})
              · <AgencyRankBadge tier={data.finance.rankTier} />
            </DialogDescription>
          )}
        </DialogHeader>

        {loading || !data ? (
          <div className="py-10 text-center text-sm text-gray-400">Đang tải…</div>
        ) : (
          <Tabs defaultValue="finance" className="mt-2">
            <TabsList>
              <TabsTrigger value="finance">Tài chính · tồn kho</TabsTrigger>
              <TabsTrigger value="warnings">Cảnh báo ({data.warnings.length})</TabsTrigger>
              <TabsTrigger value="transactions" onClick={loadTxns}>Giao dịch 30 ngày</TabsTrigger>
              <TabsTrigger value="restock" onClick={loadSuggestions}>Đề xuất nhập hàng</TabsTrigger>
            </TabsList>

            {/* Tab 1: Finance + inventory card */}
            <TabsContent value="finance" className="pt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FinanceStat label="Đặt cọc" icon={<Wallet className="w-4 h-4 text-blue-600" />} value={formatVND(data.finance.depositAmount)} />
                <FinanceStat label="Hàng đã nhận" icon={<Package className="w-4 h-4 text-emerald-600" />} value={formatVND(data.finance.receivedValue)} />
                <FinanceStat label="Hàng đã bán" icon={<ShoppingCart className="w-4 h-4 text-purple-600" />} value={formatVND(data.finance.soldValue)} />
                <FinanceStat label="Tồn kho hiện tại" icon={<Package className="w-4 h-4 text-amber-600" />} value={formatVND(data.finance.currentInventory)} />
                <FinanceStat label="Hạn mức còn lại" icon={<Wallet className="w-4 h-4 text-teal-600" />} value={formatVND(data.finance.creditRemaining)} />
                <FinanceStat label="Doanh thu tháng này" icon={<TrendingUp className="w-4 h-4 text-green-600" />} value={formatVND(data.finance.monthlyRevenue)} />
              </div>

              <div className="rounded-md border border-gray-200 p-3 bg-gray-50/50">
                <p className="text-xs uppercase text-gray-500 tracking-wide mb-1">Tổng doanh thu (tất cả thời gian)</p>
                <p className="text-lg font-bold text-gray-800">{formatVND(data.finance.totalRevenue)}</p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={loadSuggestions}>
                  <ClipboardList className="w-4 h-4 mr-1" /> Xem đề xuất nhập hàng
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Warnings */}
            <TabsContent value="warnings" className="pt-4">
              {data.warnings.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Không có cảnh báo</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead>Hạn sử dụng</TableHead>
                      <TableHead>Loại cảnh báo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.warnings.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.product.name}</TableCell>
                        <TableCell className="text-right">{w.quantity}</TableCell>
                        <TableCell className="text-xs">{new Date(w.expiryDate).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell><WarningBadge type={w.warningType} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tab 3: Transactions (30 days) + Export */}
            <TabsContent value="transactions" className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {txns ? `${txns.length} giao dịch trong 30 ngày qua` : 'Click tab để tải…'}
                </p>
                <Button variant="outline" size="sm" onClick={downloadTxns}>
                  <Download className="w-4 h-4 mr-1" /> Xuất Excel đối soát
                </Button>
              </div>
              {loadingTxns ? (
                <p className="py-6 text-center text-sm text-gray-400">Đang tải…</p>
              ) : !txns ? null : txns.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Không có giao dịch trong 30 ngày</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Mã GD</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txns.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{new Date(t.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="font-mono text-xs">KV-{t.id}</TableCell>
                        <TableCell className="text-xs">{t.customer?.name || '—'}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate">
                          {t.items.map((i) => `${i.product.name} x${i.quantity}`).join('; ')}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatVND(t.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge className={
                            t.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 text-xs' :
                            t.status === 'PENDING'   ? 'bg-amber-100 text-amber-700 text-xs' :
                            'bg-gray-100 text-gray-600 text-xs'
                          }>{t.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tab 4: Restock suggestions */}
            <TabsContent value="restock" className="pt-4 space-y-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900">
                <b>Logic đề xuất:</b> dựa trên tốc độ bán 30 ngày qua, đề xuất nhập đủ tồn kho
                cho 14 ngày (giả định hiện còn 3 ngày tồn). Tính theo giá vốn (cogsPct × price).
              </div>
              {loadingSuggestions ? (
                <p className="py-6 text-center text-sm text-gray-400">Đang tải…</p>
              ) : !suggestions ? (
                <p className="py-6 text-center text-sm text-gray-400">Click tab để tải…</p>
              ) : suggestions.suggestions.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Không có sản phẩm nào cần nhập thêm (đại lý đủ tồn hoặc chưa có dữ liệu bán)
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      <b>{suggestions.suggestions.length}</b> sản phẩm cần nhập · Tổng ước tính:{' '}
                      <b className="text-emerald-700">{formatVND(suggestions.totalEstimate)}</b>
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="text-right">Bán 30 ngày</TableHead>
                        <TableHead className="text-right">Bán TB/ngày</TableHead>
                        <TableHead className="text-right">Đề xuất nhập</TableHead>
                        <TableHead className="text-right">Chi phí ước tính</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.suggestions.map((s) => (
                        <TableRow key={s.product.id}>
                          <TableCell className="font-medium">{s.product.name}</TableCell>
                          <TableCell className="text-right">{s.soldLast30d}</TableCell>
                          <TableCell className="text-right text-gray-500">{s.dailyAvg}</TableCell>
                          <TableCell className="text-right">
                            <b className="text-emerald-700">{s.suggestQty}</b>{' '}
                            <span className="text-xs text-gray-400">{s.product.unit || ''}</span>
                          </TableCell>
                          <TableCell className="text-right">{formatVND(s.estimatedCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

function FinanceStat({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  return (
    <div className="rounded-md border border-emerald-100 bg-white p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs uppercase text-gray-500 tracking-wide">{label}</p>
      </div>
      <p className="text-base font-bold text-gray-800">{value}</p>
    </div>
  );
}

function WarningBadge({ type }: { type: string }) {
  if (type === 'low_stock') return <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs">Sắp hết</Badge>;
  if (type === 'expiring_soon') return <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">Sắp hết hạn</Badge>;
  if (type === 'expired') return <Badge className="bg-red-200 text-red-800 border border-red-400 text-xs">Hết hạn</Badge>;
  return <Badge className="bg-gray-100 text-gray-600 text-xs">{type}</Badge>;
}

// ============================================================
// Bulk notification modal (P2.7)
// ============================================================
export function AgencyBulkNotifyModal({
  open, onOpenChange, selectedAgencies, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedAgencies: AgencyRow[];
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
    if (selectedAgencies.length === 0) {
      setError('Chưa chọn đại lý nào');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.adminBulkNotify({
        userIds: selectedAgencies.map((a) => a.userId),
        title: title.trim(),
        content: content.trim(),
        type: 'AGENCY_BROADCAST',
      }) as { sent: number };
      onSuccess(res.sent ?? selectedAgencies.length);
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
          <DialogTitle>Gửi thông báo cho đại lý</DialogTitle>
          <DialogDescription>Gửi cho <b>{selectedAgencies.length}</b> đại lý đã chọn</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="max-h-24 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
            {selectedAgencies.map((a) => (
              <span key={a.id} className="inline-block mr-2 mb-1 rounded bg-white border px-1.5 py-0.5">
                {a.name}
              </span>
            ))}
          </div>
          <div>
            <Label htmlFor="a-notif-title">Tiêu đề *</Label>
            <Input id="a-notif-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Lịch giao hàng tuần tới" />
          </div>
          <div>
            <Label htmlFor="a-notif-content">Nội dung *</Label>
            <textarea
              id="a-notif-content"
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
            {submitting ? 'Đang gửi…' : `Gửi cho ${selectedAgencies.length} đại lý`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Warning pill shown inside the list table
export function LowStockPill({ count }: { count: number }) {
  if (count === 0) return <span className="text-xs text-gray-300">—</span>;
  return (
    <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs inline-flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" /> {count} SP
    </Badge>
  );
}
