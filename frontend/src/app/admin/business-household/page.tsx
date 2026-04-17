'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Eye, Download } from 'lucide-react';
import { HkdDetailModal, HkdWarningBadges, type HouseholdRow } from './modals';

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

  const fetchData = () => {
    setLoading(true);
    api.adminBusinessHouseholds()
      .then((d) => setHouseholds(d as HouseholdRow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

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
            <CardTitle>Danh sách HKD ({households.length})</CardTitle>
            <p className="text-sm text-slate-500">
              CTV đạt cấp PP trở lên đăng ký HKD để ký HĐ Đại lý bán lẻ + HĐ Dịch vụ đào tạo (V13.1 Mục 5.3)
            </p>
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
                  {households.map((h) => (
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
                  {households.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        Chưa có HKD nào
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
