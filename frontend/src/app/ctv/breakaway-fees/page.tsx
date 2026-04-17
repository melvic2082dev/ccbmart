'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';

interface BreakFeeRecord {
  id: number;
  level: number;
  amount: number;
  month: string;
  status: string;
  fromUser: { id: number; name: string; rank: string | null };
  breakawayLog: { id: number; breakawayAt: string; expireAt: string; status: string } | null;
}

interface BreakFeeResponse {
  month: string;
  summary: { level1: number; level2: number; level3: number; total: number };
  records: BreakFeeRecord[];
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const LEVEL_LABEL: Record<number, string> = {
  1: 'L1 (3% — F1 cũ)',
  2: 'L2 (2% — F2 cũ)',
  3: 'L3 (1% — GĐKD)',
};
const LEVEL_COLOR: Record<number, string> = {
  1: 'bg-orange-100 text-orange-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-indigo-100 text-indigo-700',
};

export default function CtvBreakawayFeesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<BreakFeeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.ctvBreakawayFees(month)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Network size={24} /> Phí sau thoát ly
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Trong 12 tháng sau khi mentee thoát ly: F1 cũ nhận 3%, F2 cũ nhận 2%, GĐKD nhận 1% (nếu không phải F1/F2 cũ).
        Tính trên toàn doanh số nhánh thoát — CCB Mart chi trả.
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
                <p className="text-sm text-slate-500">Level 1 (3% F1 cũ)</p>
                <p className="text-xl font-bold text-orange-700">{formatVND(data.summary.level1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Level 2 (2% F2 cũ)</p>
                <p className="text-xl font-bold text-amber-700">{formatVND(data.summary.level2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Level 3 (1% GĐKD)</p>
                <p className="text-xl font-bold text-indigo-700">{formatVND(data.summary.level3)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Tổng phí thoát ly</p>
                <p className="text-xl font-bold">{formatVND(data.summary.total)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Chi tiết ({data.records.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.records.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có phí sau thoát ly trong tháng</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b">
                      <tr>
                        <th className="py-2 px-2">Level</th>
                        <th className="py-2 px-2">Nhánh thoát</th>
                        <th className="py-2 px-2">Thoát ly từ</th>
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
                          <td className="py-2 px-2 text-slate-500">
                            {r.breakawayLog ? new Date(r.breakawayLog.breakawayAt).toLocaleDateString('vi-VN') : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold">{formatVND(r.amount)}</td>
                          <td className="py-2 px-2">
                            <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                              {r.status}
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
