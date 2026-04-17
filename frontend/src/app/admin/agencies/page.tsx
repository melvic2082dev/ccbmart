'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Building2, Wallet, TrendingUp, AlertTriangle, Search, Bell, Eye,
} from 'lucide-react';
import {
  AgencyDetailModal, AgencyBulkNotifyModal, AgencyRankBadge, LowStockPill,
  RANK_TIER_LABEL, type AgencyRow,
} from './modals';

const PAGE_SIZE = 20;
const REVENUE_FILTERS: Array<{ value: string; label: string; min: number; max: number | null }> = [
  { value: 'ALL',  label: 'Mọi doanh số', min: 0,           max: null },
  { value: 'HIGH', label: '≥ 100 triệu',  min: 100_000_000, max: null },
  { value: 'MID',  label: '20–100 triệu', min: 20_000_000,  max: 100_000_000 },
  { value: 'LOW',  label: '< 20 triệu',   min: 0,           max: 20_000_000 },
];

export default function AdminAgencies() {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [revenueFilter, setRevenueFilter] = useState<string>('ALL');
  const [warningFilter, setWarningFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Selection + modals
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAgencies = () => {
    setLoading(true);
    api.adminAgencies()
      .then((d) => setAgencies(Array.isArray(d) ? (d as AgencyRow[]) : []))
      .catch((err) => console.error('Failed to fetch agencies:', err))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAgencies(); }, []);

  // Derived options
  const regionOptions = useMemo(() => {
    const set = new Set(agencies.map((a) => a.region));
    return Array.from(set).sort();
  }, [agencies]);

  // Stats
  const totalDeposit  = agencies.reduce((s, a) => s + a.depositAmount, 0);
  const totalRevenue  = agencies.reduce((s, a) => s + a.totalRevenue, 0);
  const totalWarnings = agencies.reduce((s, a) => s + a.warningCount, 0);

  // Filtered
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const revRange = REVENUE_FILTERS.find((r) => r.value === revenueFilter) || REVENUE_FILTERS[0];
    return agencies.filter((a) => {
      if (q &&
          !a.name.toLowerCase().includes(q) &&
          !a.user.name.toLowerCase().includes(q) &&
          !a.user.phone?.toLowerCase().includes(q)) return false;
      if (tierFilter !== 'ALL' && a.rankTier !== tierFilter) return false;
      if (regionFilter !== 'ALL' && a.region !== regionFilter) return false;
      const m = a.monthlyRevenue;
      if (m < revRange.min) return false;
      if (revRange.max !== null && m >= revRange.max) return false;
      if (warningFilter === 'HAS_WARN' && a.warningCount === 0) return false;
      if (warningFilter === 'LOW_STOCK' && a.lowStockCount === 0) return false;
      if (warningFilter === 'NONE' && a.warningCount > 0) return false;
      return true;
    });
  }, [agencies, search, tierFilter, regionFilter, revenueFilter, warningFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination on filter change
  useEffect(() => { setPage(1); }, [search, tierFilter, regionFilter, revenueFilter, warningFilter]);

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const ids = paged.map((a) => a.id);
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const selectedList = agencies.filter((a) => selectedIds.has(a.id));
  const clearSelection = () => setSelectedIds(new Set());

  const openRowDetail = (a: AgencyRow) => {
    setDetailId(a.id);
    setOpenDetail(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Quản lý Đại lý</h2>
        <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">CCB Mart Admin</Badge>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={<Building2 className="text-emerald-600" size={20} />} label="Tổng đại lý" value={agencies.length.toString()} color="emerald" />
            <StatCard icon={<Wallet className="text-blue-600" size={20} />} label="Tổng đặt cọc" value={formatVND(totalDeposit)} color="blue" />
            <StatCard icon={<TrendingUp className="text-amber-600" size={20} />} label="Tổng doanh thu" value={formatVND(totalRevenue)} color="amber" />
            <StatCard icon={<AlertTriangle className="text-red-600" size={20} />} label="Cảnh báo tồn kho" value={totalWarnings.toString()} color="red" />
          </div>

          {/* List card */}
          <Card className="mb-6 border-emerald-100 shadow-sm">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <CardTitle className="text-gray-800">
                    Danh sách đại lý
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({filtered.length}/{agencies.length})
                    </span>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenBulk(true)}
                    disabled={selectedIds.size === 0}
                    title={selectedIds.size === 0 ? 'Chọn ít nhất 1 đại lý' : `Gửi thông báo cho ${selectedIds.size} đại lý`}
                  >
                    <Bell className="w-4 h-4 mr-1" />
                    Gửi thông báo {selectedIds.size > 0 && `(${selectedIds.size})`}
                  </Button>
                </div>
              </div>

              {/* Filter bar */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên / chủ / SĐT…"
                    className="pl-8"
                  />
                </div>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Mọi hạng</option>
                  <option value="KIM_CUONG">Kim cương</option>
                  <option value="VANG">Vàng</option>
                  <option value="BAC">Bạc</option>
                  <option value="DONG">Đồng</option>
                </select>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Mọi khu vực</option>
                  {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  value={revenueFilter}
                  onChange={(e) => setRevenueFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {REVENUE_FILTERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <select
                  value={warningFilter}
                  onChange={(e) => setWarningFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Mọi cảnh báo</option>
                  <option value="HAS_WARN">Có cảnh báo</option>
                  <option value="LOW_STOCK">Có hàng sắp hết</option>
                  <option value="NONE">Không cảnh báo</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Chọn tất cả"
                          checked={paged.length > 0 && paged.every((a) => selectedIds.has(a.id))}
                          onChange={toggleSelectAllVisible}
                          className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                        />
                      </TableHead>
                      <TableHead>Tên đại lý</TableHead>
                      <TableHead>Chủ</TableHead>
                      <TableHead>Khu vực</TableHead>
                      <TableHead>Hạng</TableHead>
                      <TableHead className="text-right">Đặt cọc</TableHead>
                      <TableHead className="text-right">DT tháng</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead>Tồn thấp</TableHead>
                      <TableHead className="text-right">Giao dịch</TableHead>
                      <TableHead className="text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                          Không có đại lý phù hợp
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((a) => (
                        <TableRow
                          key={a.id}
                          className={`hover:bg-emerald-50 transition-colors cursor-pointer ${selectedIds.has(a.id) ? 'bg-emerald-50/60' : ''}`}
                          onClick={(e) => {
                            // Don't trigger row-click when clicking checkbox or action buttons
                            const target = e.target as HTMLElement;
                            if (target.closest('input, button')) return;
                            openRowDetail(a);
                          }}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              aria-label={`Chọn ${a.name}`}
                              checked={selectedIds.has(a.id)}
                              onChange={() => toggleSelect(a.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                            />
                          </TableCell>
                          <TableCell className="font-medium text-gray-800">{a.name}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{a.user.name}</TableCell>
                          <TableCell className="text-sm">{a.region}</TableCell>
                          <TableCell><AgencyRankBadge tier={a.rankTier} /></TableCell>
                          <TableCell className="text-right text-sm">{formatVND(a.depositAmount)}</TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={a.monthlyRevenue >= a.prevMonthlyRev ? 'text-emerald-700' : 'text-red-600'}>
                              {formatVND(a.monthlyRevenue)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatVND(a.currentInventory)}</TableCell>
                          <TableCell><LowStockPill count={a.lowStockCount} /></TableCell>
                          <TableCell className="text-right">{a.transactions}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon-sm" title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); openRowDetail(a); }}>
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {filtered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                    <p className="text-gray-500">Trang {page}/{totalPages}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau →</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modals */}
      <AgencyDetailModal open={openDetail} onOpenChange={setOpenDetail} agencyId={detailId} />
      <AgencyBulkNotifyModal
        open={openBulk}
        onOpenChange={setOpenBulk}
        selectedAgencies={selectedList}
        onSuccess={(sent) => {
          setToast(`Đã gửi thông báo cho ${sent} đại lý`);
          clearSelection();
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function StatCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-100',
    blue: 'bg-blue-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bg[color] ?? 'bg-gray-100'}`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-xl font-bold truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Re-export RANK_TIER_LABEL for potential external use
export { RANK_TIER_LABEL };
