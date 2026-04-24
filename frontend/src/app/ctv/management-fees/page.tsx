'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';

interface MgmtFeeRecord {
  id: number;
  level: number;
  amount: number;
  month: string;
  status: string;
  createdAt: string;
  fromUser: { id: number; name: string; rank: string | null; email: string };
}

interface MgmtFeeResponse {
  month: string;
  summary: { f1: number; f2: number; f3: number; total: number };
  records: MgmtFeeRecord[];
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const LEVEL_LABEL: Record<number, string> = { 1: 'F1 (10%)', 2: 'F2 (5%)', 3: 'F3 (3%)' };
const LEVEL_COLOR: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
};

export default function CtvManagementFeesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MgmtFeeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.ctvManagementFees(month)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Coins size={24} /> Phí quản lý trong nhóm
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Phí quản lý F1/F2/F3 trên combo bán lẻ trực tiếp của cấp dưới.
        Điều kiện: ≥ 20h đào tạo/tháng. CCB Mart chi trả từ doanh thu bán hàng.
      </p>

      <div className="mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">F1 (10% — TP+)</p>
                <p className="text-xl font-bold text-emerald-700">{formatVND(data.summary.f1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">F2 (5% — GĐV+)</p>
                <p className="text-xl font-bold text-blue-700">{formatVND(data.summary.f2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">F3 (3% — GĐKD)</p>
                <p className="text-xl font-bold text-purple-700">{formatVND(data.summary.f3)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Tổng phí quản lý</p>
                <p className="text-xl font-bold">{formatVND(data.summary.total)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Chi tiết phí nhận được ({data.records.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.records.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có phí quản lý trong tháng</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b">
                      <tr>
                        <th className="py-2 px-2">Level</th>
                        <th className="py-2 px-2">Từ CTV</th>
                        <th className="py-2 px-2">Cấp</th>
                        <th className="py-2 px-2 text-right">Phí</th>
                        <th className="py-2 px-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 px-2">
                            <Badge className={LEVEL_COLOR[r.level]}>{LEVEL_LABEL[r.level]}</Badge>
                          </td>
                          <td className="py-2 px-2">{r.fromUser.name}</td>
                          <td className="py-2 px-2 text-slate-500">{r.fromUser.rank || 'CTV'}</td>
                          <td className="py-2 px-2 text-right font-mono font-semibold">{formatVND(r.amount)}</td>
                          <td className="py-2 px-2">
                            <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                              {r.status === 'PAID' ? 'Đã trả' : r.status === 'PENDING' ? 'Chờ trả' : r.status}
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
        </>
      ) : (
        <p className="text-slate-500">Không có dữ liệu</p>
      )}
    </>
  );
}
