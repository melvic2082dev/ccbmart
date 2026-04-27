'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Eye, Download, Search } from 'lucide-react';
import { HkdDetailModal, HkdWarningBadges, type HouseholdRow } from './modals';

const RANK_LABEL: Record<string, string> = {
  PP: 'PP', TP: 'TP', GDV: 'GĐV', GDKD: 'GĐKD',
};
const RANK_ORDER = ['GDKD', 'GDV', 'TP', 'PP'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  terminated: 'bg-red-100 text-red-700',
};

function daysLeft(date?: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function ExpiryCell({ date }: { date?: string | null }) {
  const d = daysLeft(date);
  if (d === null) return <span className="text-gray-300">—</span>;
  const cls = d < 0 ? 'text-red-600 font-semibold' : d <= 30 ? 'text-amber-600 font-semibold' : 'text-gray-700';
  return (
    <span className={`text-xs ${cls}`} title={date ? new Date(date).toLocaleDateString('vi-VN') : ''}>
      {d < 0 ? `Hết ${-d}d` : `Còn ${d}d`}
    </span>
  );
}

export default function BusinessHouseholdPage() {
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchData = () => {
    setLoading(true);
    api.adminBusinessHouseholds()
      .then((d) => setHouseholds(d as HouseholdRow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return households.filter((h) => {
      if (q) {
        const hay = [
          h.businessName,
          h.user.name,
          h.taxCode ?? '',
          h.businessLicense ?? '',
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (rankFilter !== 'ALL' && h.user.rank !== rankFilter) return false;
      if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
      return true;
    });
  }, [households, search, rankFilter, statusFilter]);

  const handleAction = async (userId: number, action: string) => {
    try {
      await api.adminBusinessHouseholdAction({ userId, action });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openRowDetail = (id: number) => {
    setDetailId(id);
    setOpenDetail(true);
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Building2 size={24} /> Hộ kinh doanh (HKD)
      </h2>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách HKD <span className="text-sm font-normal text-gray-500">({filtered.length}/{households.length})</span>
            </CardTitle>
            <p className="text-sm text-slate-500">
              CTV đạt cấp PP trở lên đăng ký HKD để ký HĐ Đại lý bán lẻ + HĐ Dịch vụ đào tạo
            </p>

            {/* Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên HKD / CTV / MST / GPKD…"
                  className="pl-8"
                />
              </div>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả rank</option>
                {RANK_ORDER.map(r => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="suspended">Tạm ngưng</option>
                <option value="terminated">Chấm dứt</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên HKD</TableHead>
                    <TableHead>CTV · Rank</TableHead>
                    <TableHead>MST · GPKD</TableHead>
                    <TableHead>HĐ Đại lý</TableHead>
                    <TableHead>HĐ DV đào tạo</TableHead>
                    <TableHead>TK Ngân hàng</TableHead>
                    <TableHead>Cảnh báo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((h) => (
                    <TableRow key={h.id} className="hover:bg-emerald-50/60 cursor-pointer" onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a')) return;
                      openRowDetail(h.id);
                    }}>
                      <TableCell className="font-medium">
                        {h.businessName}
                        {h.dealerPdfUrl && (
                          <a
                            href={h.dealerPdfUrl}
                            target="_blank" rel="noopener"
                            className="ml-1 inline-flex text-blue-600"
                            title="Tải HĐ Đại lý"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3 inline" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{h.user.name}</div>
                        <Badge variant="outline" className="text-xs">{h.user.rank}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono">{h.taxCode || '—'}</div>
                        <div className="text-gray-500">{h.businessLicense || '—'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono text-gray-600">{h.dealerContractNo || '—'}</div>
                        <div>Ký: {h.dealerSignedAt ? new Date(h.dealerSignedAt).toLocaleDateString('vi-VN') : '—'}</div>
                        <ExpiryCell date={h.dealerExpiredAt} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono text-gray-600">{h.trainingContractNo || '—'}</div>
                        <div>Ký: {h.trainingSignedAt ? new Date(h.trainingSignedAt).toLocaleDateString('vi-VN') : '—'}</div>
                        <ExpiryCell date={h.trainingExpiredAt} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {h.bankAccountNo ? (
                          <>
                            <div className="font-medium">{h.bankName}</div>
                            <div className="font-mono text-gray-600">{h.bankAccountNo}</div>
                          </>
                        ) : (
                          <span className="text-amber-600">⚠️ Chưa có</span>
                        )}
                      </TableCell>
                      <TableCell><HkdWarningBadges warnings={h.warnings} /></TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-700'}>
                          {h.status === 'active' ? 'Hoạt động' : h.status === 'suspended' ? 'Tạm ngưng' : 'Chấm dứt'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon-sm" title="Chi tiết" onClick={(e) => { e.stopPropagation(); openRowDetail(h.id); }}>
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          {h.status === 'active' && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAction(h.userId, 'suspend'); }} className="text-xs text-yellow-700">
                              Tạm ngưng
                            </Button>
                          )}
                          {h.status === 'suspended' && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAction(h.userId, 'activate'); }} className="text-xs text-green-700">
                              Kích hoạt
                            </Button>
                          )}
                          {h.status !== 'terminated' && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAction(h.userId, 'terminate'); }} className="text-xs text-red-700">
                              Chấm dứt
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        {households.length === 0 ? 'Chưa có HKD nào' : 'Không có HKD phù hợp'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <HkdDetailModal
        open={openDetail}
        onOpenChange={setOpenDetail}
        hkdId={detailId}
        onChanged={fetchData}
      />
    </>
  );
}
