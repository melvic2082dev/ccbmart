'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Play } from 'lucide-react';

interface AdminMgmtFeeRecord {
  id: number;
  level: number;
  amount: number;
  month: string;
  status: string;
  fromUser: { id: number; name: string; rank: string | null };
  toUser: { id: number; name: string; rank: string | null };
}

interface AdminMgmtFeeResponse {
  records: AdminMgmtFeeRecord[];
  total: number;
  byLevel: { f1: number; f2: number; f3: number };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const LEVEL_LABEL: Record<number, string> = { 1: 'F1', 2: 'F2', 3: 'F3' };
const LEVEL_COLOR: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
};

export default function AdminManagementFeesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<AdminMgmtFeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    api.adminManagementFees({ month })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [month]);

  const handleProcess = async () => {
    if (!confirm(`Tính lại phí quản lý cho tháng ${month}?`)) return;
    setProcessing(true);
    try {
      const res = await api.adminProcessManagementFees(month);
      alert(`Đã tạo ${res.created} record phí quản lý`);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await api.adminMarkManagementFeePaid(id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Coins size={24} /> Phí quản lý (F1/F2/F3) — C12.4
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Nguyên tắc: CCB Mart chi trả toàn bộ phí quản lý từ doanh thu bán hàng. Không có chuyển tiền giữa đối tác.
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
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Play size={16} /> {processing ? 'Đang tính...' : 'Tính lại tháng'}
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng F1 (10%)</p><p className="text-xl font-bold text-emerald-700">{formatVND(data.byLevel.f1)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng F2 (5%)</p><p className="text-xl font-bold text-blue-700">{formatVND(data.byLevel.f2)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng F3 (3%)</p><p className="text-xl font-bold text-purple-700">{formatVND(data.byLevel.f3)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng cộng</p><p className="text-xl font-bold">{formatVND(data.total)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách phí quản lý ({data.records.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.records.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có dữ liệu. Nhấn &quot;Tính lại tháng&quot; để trigger.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b">
                      <tr>
                        <th className="py-2 px-2">Tháng</th>
                        <th className="py-2 px-2">Level</th>
                        <th className="py-2 px-2">Từ (CTV)</th>
                        <th className="py-2 px-2">Nhận (Cấp trên)</th>
                        <th className="py-2 px-2 text-right">Phí</th>
                        <th className="py-2 px-2">Trạng thái</th>
                        <th className="py-2 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 px-2 font-mono text-xs">{r.month}</td>
                          <td className="py-2 px-2"><Badge className={LEVEL_COLOR[r.level]}>{LEVEL_LABEL[r.level]}</Badge></td>
                          <td className="py-2 px-2">{r.fromUser.name} <span className="text-slate-500">({r.fromUser.rank || 'CTV'})</span></td>
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
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </DashboardLayout>
  );
}
