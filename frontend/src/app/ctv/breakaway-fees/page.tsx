'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';
import { ACCENT_CLASSES } from '@/lib/page-accent';

const ACCENT = ACCENT_CLASSES.orange;

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
  eligible: boolean;
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

  const Header = (
    <div className="mb-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Network size={24} className={ACCENT.icon} /> Phí sau thoát ly
      </h2>
      <div className={`mt-2 w-12 h-1 ${ACCENT.bar} rounded-full`} />
    </div>
  );

  if (!loading && data && !data.eligible) {
    return (
      <>
        {Header}
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Đây là phí dành cho CTV cấp trên của CTV đã vượt cấp bậc quản lý.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {Header}
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
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
                <ul className="divide-y">
                  {data.records.map((r, idx) => (
                    <li
                      key={r.id}
                      className={`px-3 py-3 ${idx % 2 === 0 ? 'bg-slate-50/40 dark:bg-slate-50/40' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={LEVEL_COLOR[r.level]}>{LEVEL_LABEL[r.level]}</Badge>
                            <span className="font-medium truncate">{r.fromUser.name}</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Thoát ly: {r.breakawayLog ? new Date(r.breakawayLog.breakawayAt).toLocaleDateString('vi-VN') : '-'}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="font-mono font-semibold tabular-nums">{formatVND(r.amount)}</p>
                          <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {r.status === 'PAID' ? 'Đã trả' : r.status === 'PENDING' ? 'Chờ trả' : r.status === 'CANCELLED' ? 'Đã huỷ' : 'Khác'}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
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
