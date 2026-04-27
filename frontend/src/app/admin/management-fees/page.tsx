'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Coins, Play, Info, Check, X } from 'lucide-react';

interface AdminMgmtFeeRecord {
  id: number;
  level: number;
  amount: number | string;
  month: string;
  status: string;
  fromUser: { id: number; name: string; rank: string | null };
  toUser: { id: number; name: string; rank: string | null };
}

interface PartnerAggregate {
  partnerId: number;
  partnerName: string;
  partnerRank: string;
  month: string;
  f1: number | string;
  f2: number | string;
  f3: number | string;
  total: number | string;
  hasValidLog: boolean;
  status: 'PENDING' | 'PAID' | 'PARTIAL';
}

interface AdminMgmtFeeResponse {
  records?: AdminMgmtFeeRecord[];
  byLevel?: { f1?: number | string; f2?: number | string; f3?: number | string };
  byPartner?: PartnerAggregate[];
  total?: number | string;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ trả',
  PAID: 'Đã trả',
  PARTIAL: 'Trả một phần',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
};

export default function AdminManagementFeesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<AdminMgmtFeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resultBanner, setResultBanner] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.adminManagementFees({ month })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [month]);

  const handleProcess = async () => {
    if (!confirm(`Tính lại payout V13.4 cho tháng ${month}? Sẽ tạo hóa đơn + payout log cho tất cả đối tác.`)) return;
    setProcessing(true);
    setResultBanner(null);
    try {
      const [year, m] = month.split('-').map(Number);
      const res = await api.adminProcessMonthlyPayout(m, year);
      setResultBanner(`Đã xử lý ${res.partnersProcessed} đối tác · K = ${res.kFactor} · tổng chi ${formatVND(Number(res.totalDisbursed) || 0)}`);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const partners = data?.byPartner ?? [];

  return (
    <>
      <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
        <Coins size={24} /> Phí quản lý theo cấp dẫn dắt
      </h2>

      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-900 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Phí quản lý cấp 1 (10%), cấp 2 (5%), cấp 3 (3%) theo doanh số cấp dưới. Yêu cầu đối tác đạt ≥ 20h log đào tạo/tháng.</span>
      </div>

      <div className="mb-4 flex gap-3 items-center flex-wrap">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        />
        <button
          onClick={handleProcess}
          disabled={processing}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Play size={16} /> {processing ? 'Đang tính...' : 'Tính lại tháng'}
        </button>
        {resultBanner && <span className="text-sm text-green-700">{resultBanner}</span>}
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng Cấp 1 (10%)</p><p className="text-xl font-bold text-emerald-700">{formatVND(Number(data.byLevel?.f1 ?? 0) || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng Cấp 2 (5%)</p><p className="text-xl font-bold text-blue-700">{formatVND(Number(data.byLevel?.f2 ?? 0) || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng Cấp 3 (3%)</p><p className="text-xl font-bold text-purple-700">{formatVND(Number(data.byLevel?.f3 ?? 0) || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng cộng</p><p className="text-xl font-bold">{formatVND(Number(data.total ?? 0) || 0)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tổng hợp theo đối tác ({partners.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {partners.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có dữ liệu. Nhấn &quot;Tính lại tháng&quot; để trigger.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tháng</TableHead>
                          <TableHead>Đối tác</TableHead>
                          <TableHead>Xếp hạng</TableHead>
                          <TableHead className="text-right">Cấp 1 (10%)</TableHead>
                          <TableHead className="text-right">Cấp 2 (5%)</TableHead>
                          <TableHead className="text-right">Cấp 3 (3%)</TableHead>
                          <TableHead className="text-center">Log 20h</TableHead>
                          <TableHead className="text-right">Tổng</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partners.map((p) => (
                          <TableRow key={p.partnerId}>
                            <TableCell className="font-mono text-xs">{p.month}</TableCell>
                            <TableCell className="font-medium">{p.partnerName}</TableCell>
                            <TableCell><Badge className="bg-slate-100 text-slate-700 text-xs">{p.partnerRank}</Badge></TableCell>
                            <TableCell className="text-right font-mono">{Number(p.f1) > 0 ? formatVND(Number(p.f1)) : '—'}</TableCell>
                            <TableCell className="text-right font-mono">{Number(p.f2) > 0 ? formatVND(Number(p.f2)) : '—'}</TableCell>
                            <TableCell className="text-right font-mono">{Number(p.f3) > 0 ? formatVND(Number(p.f3)) : '—'}</TableCell>
                            <TableCell className="text-center">
                              {p.hasValidLog ? <Check className="w-4 h-4 text-green-600 inline" /> : <X className="w-4 h-4 text-red-500 inline" />}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">{formatVND(Number(p.total) || 0)}</TableCell>
                            <TableCell><Badge className={`${STATUS_COLOR[p.status]} text-xs`}>{STATUS_LABEL[p.status]}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile compact card */}
                  <div className="md:hidden space-y-2">
                    {partners.map((p) => (
                      <div key={p.partnerId} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className="bg-slate-100 text-slate-700 text-xs shrink-0">{p.partnerRank}</Badge>
                            <p className="font-medium text-gray-800 truncate">{p.partnerName}</p>
                          </div>
                          <Badge className={`${STATUS_COLOR[p.status]} text-xs shrink-0`}>{STATUS_LABEL[p.status]}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] uppercase text-gray-500">F1 (10%)</p>
                            <p className="text-xs font-mono">{Number(p.f1) > 0 ? formatVND(Number(p.f1)) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-gray-500">F2 (5%)</p>
                            <p className="text-xs font-mono">{Number(p.f2) > 0 ? formatVND(Number(p.f2)) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-gray-500">F3 (3%)</p>
                            <p className="text-xs font-mono">{Number(p.f3) > 0 ? formatVND(Number(p.f3)) : '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t text-sm">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            Log 20h: {p.hasValidLog ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <p className="font-bold text-emerald-700">{formatVND(Number(p.total) || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  );
}
