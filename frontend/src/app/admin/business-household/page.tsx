'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Eye, Download, Search, Copy, Check } from 'lucide-react';
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

function CopyButton({ value, title = 'Sao chép' }: { value: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title={title}
      className="inline-flex items-center text-emerald-600 hover:text-emerald-700"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

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
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                        <Badge variant="outline" className="text-xs">{RANK_LABEL[h.user.rank] ?? h.user.rank}</Badge>
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

            {/* Mobile compact card */}
            <div className="md:hidden p-3 space-y-3">
              {filtered.length === 0 ? (
                <p className="text-center py-8 text-slate-500">
                  {households.length === 0 ? 'Chưa có HKD nào' : 'Không có HKD phù hợp'}
                </p>
              ) : filtered.map((h) => (
                <div key={h.id} className="tap-card rounded-lg border border-gray-200 bg-white p-3 space-y-2" onClick={() => openRowDetail(h.id)}>
                  {/* Row 1: HKD name + download HĐ */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-800 truncate">{h.businessName}</p>
                    {h.dealerPdfUrl && (
                      <a
                        href={h.dealerPdfUrl}
                        target="_blank" rel="noopener"
                        className="text-blue-600 shrink-0"
                        title="Tải HĐ Đại lý"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Row 2: Rank + Status (same row, per user request) */}
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">{RANK_LABEL[h.user.rank] ?? h.user.rank}</Badge>
                      <span className="text-gray-700 truncate">{h.user.name}</span>
                    </div>
                    <Badge className={STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-700'}>
                      {h.status === 'active' ? 'Hoạt động' : h.status === 'suspended' ? 'Tạm ngưng' : 'Chấm dứt'}
                    </Badge>
                  </div>

                  {/* MST · GPKD */}
                  <div className="text-xs space-y-0.5 pt-2 border-t">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">MST:</span>
                      <span className="font-mono">{h.taxCode || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">GPKD:</span>
                      <span className="font-mono">{h.businessLicense || '—'}</span>
                    </div>
                  </div>

                  {/* Bank with copy button */}
                  <div className="text-xs pt-2 border-t">
                    <p className="text-gray-500 mb-0.5">TK Ngân hàng:</p>
                    {h.bankAccountNo ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium">{h.bankName}</span>
                          {' · '}
                          <span className="font-mono text-gray-700">{h.bankAccountNo}</span>
                        </div>
                        <CopyButton value={h.bankAccountNo} title="Sao chép số TK" />
                      </div>
                    ) : (
                      <span className="text-amber-600">⚠️ Chưa có</span>
                    )}
                  </div>

                  {/* Contracts */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <p className="text-gray-500">HĐ Đại lý</p>
                      <p className="font-mono text-gray-700">{h.dealerContractNo || '—'}</p>
                      {h.dealerSignedAt && <p className="text-gray-500">Ký: {new Date(h.dealerSignedAt).toLocaleDateString('vi-VN')}</p>}
                      <ExpiryCell date={h.dealerExpiredAt} />
                    </div>
                    <div>
                      <p className="text-gray-500">HĐ DV đào tạo</p>
                      <p className="font-mono text-gray-700">{h.trainingContractNo || '—'}</p>
                      {h.trainingSignedAt && <p className="text-gray-500">Ký: {new Date(h.trainingSignedAt).toLocaleDateString('vi-VN')}</p>}
                      <ExpiryCell date={h.trainingExpiredAt} />
                    </div>
                  </div>

                  {/* Cảnh báo (warnings) — directly above action buttons per user request */}
                  {h.warnings && h.warnings.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-1">Cảnh báo:</p>
                      <HkdWarningBadges warnings={h.warnings} />
                    </div>
                  )}

                  {/* Thao tác */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="ghost" size="icon-sm" title="Chi tiết" onClick={(e) => { e.stopPropagation(); openRowDetail(h.id); }}>
                      <Eye className="w-4 h-4 text-blue-600" />
                    </Button>
                    {h.status === 'active' && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs text-yellow-700" onClick={(e) => { e.stopPropagation(); handleAction(h.userId, 'suspend'); }}>
                        Tạm ngưng
                      </Button>
                    )}
                    {h.status === 'suspended' && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs text-green-700" onClick={(e) => { e.stopPropagation(); handleAction(h.userId, 'activate'); }}>
                        Kích hoạt
                      </Button>
                    )}
                    {h.status !== 'terminated' && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs text-red-700" onClick={(e) => { e.stopPropagation(); handleAction(h.userId, 'terminate'); }}>
                        Chấm dứt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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
