'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Play, Timer } from 'lucide-react';

interface BreakawayLog {
  id: number;
  userId: number;
  oldParentId: number;
  newParentId: number;
  breakawayAt: string;
  expireAt: string;
  status: string;
  monthsRemaining: number;
  user: { id: number; name: string; rank: string | null; email: string };
  oldParent: { id: number; name: string; rank: string | null };
  newParent: { id: number; name: string; rank: string | null };
}

interface BreakFeeRecord {
  id: number;
  level: number;
  amount: number;
  month: string;
  status: string;
  fromUser: { id: number; name: string; rank: string | null };
  toUser: { id: number; name: string; rank: string | null };
}

interface BreakFeeResponse {
  records: BreakFeeRecord[];
  total: number;
  byLevel: { level1: number; level2: number; level3: number };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminBreakawayLogsPage() {
  const [logs, setLogs] = useState<BreakawayLog[]>([]);
  const [fees, setFees] = useState<BreakFeeResponse | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.adminBreakawayLogs(),
      api.adminBreakawayFees({ month }),
    ])
      .then(([l, f]) => {
        setLogs(l);
        setFees(f);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [month]);

  const handleProcess = async () => {
    if (!confirm(`Tính phí sau thoát ly cho tháng ${month}?`)) return;
    setProcessing(true);
    try {
      const res = await api.adminProcessBreakawayFees(month);
      alert(`Đã tạo ${res.created} record phí thoát ly`);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await api.adminMarkBreakawayFeePaid(id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Network size={24} /> Thoát ly (BreakawayLogs) — C12.4
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Khi mentee thoát ly: parentId chuyển lên grandParent. Phí giai đoạn 1 (12 tháng): F1 cũ 3%, F2 cũ 2%, GĐKD 1%.
        Sau 12 tháng: tự động chuyển sang cơ chế mặc định.
      </p>

      <div className="mb-4 flex gap-3 items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        />
        <button
          onClick={handleProcess}
          disabled={processing}
          className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Play size={16} /> {processing ? 'Đang tính...' : 'Tính phí tháng'}
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <>
          {fees && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">L1 (3% F1 cũ)</p><p className="text-xl font-bold text-orange-700">{formatVND(fees.byLevel.level1)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">L2 (2% F2 cũ)</p><p className="text-xl font-bold text-amber-700">{formatVND(fees.byLevel.level2)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">L3 (1% GĐKD)</p><p className="text-xl font-bold text-indigo-700">{formatVND(fees.byLevel.level3)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng tháng</p><p className="text-xl font-bold">{formatVND(fees.total)}</p></CardContent></Card>
            </div>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Các nhánh thoát ly ({logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có nhánh thoát ly</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b">
                      <tr>
                        <th className="py-2 px-2">User thoát ly</th>
                        <th className="py-2 px-2">F1 cũ</th>
                        <th className="py-2 px-2">F2 cũ (→ parent mới)</th>
                        <th className="py-2 px-2">Ngày thoát ly</th>
                        <th className="py-2 px-2 flex items-center gap-1"><Timer size={14} /> Còn lại</th>
                        <th className="py-2 px-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id} className="border-b last:border-0">
                          <td className="py-2 px-2">{l.user.name} <span className="text-slate-500">({l.user.rank})</span></td>
                          <td className="py-2 px-2">{l.oldParent.name}</td>
                          <td className="py-2 px-2">{l.newParent.name}</td>
                          <td className="py-2 px-2 text-slate-500">{new Date(l.breakawayAt).toLocaleDateString('vi-VN')}</td>
                          <td className="py-2 px-2">
                            {l.status === 'ACTIVE' ? `${l.monthsRemaining} tháng` : '-'}
                          </td>
                          <td className="py-2 px-2">
                            <Badge className={l.status === 'ACTIVE' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'}>
                              {l.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {fees && fees.records.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Phí thoát ly tháng {month} ({fees.records.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b">
                      <tr>
                        <th className="py-2 px-2">Level</th>
                        <th className="py-2 px-2">Nhánh thoát</th>
                        <th className="py-2 px-2">Người nhận</th>
                        <th className="py-2 px-2 text-right">Phí</th>
                        <th className="py-2 px-2">Trạng thái</th>
                        <th className="py-2 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {fees.records.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 px-2">L{r.level}</td>
                          <td className="py-2 px-2">{r.fromUser.name}</td>
                          <td className="py-2 px-2">{r.toUser.name} <span className="text-slate-500">({r.toUser.rank})</span></td>
                          <td className="py-2 px-2 text-right font-mono font-semibold">{formatVND(r.amount)}</td>
                          <td className="py-2 px-2">
                            <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{r.status}</Badge>
                          </td>
                          <td className="py-2 px-2">
                            {r.status === 'PENDING' && (
                              <button
                                onClick={() => handleMarkPaid(r.id)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                              >
                                Đã trả
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
