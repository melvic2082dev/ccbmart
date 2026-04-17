'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Play, Timer, AlertTriangle } from 'lucide-react';

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

// Compute progress of 12-month window (0 = just breakaway'd, 1 = fully elapsed)
function progressOf(breakawayAt: string, expireAt: string): number {
  const start = new Date(breakawayAt).getTime();
  const end = new Date(expireAt).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 1;
  return (now - start) / (end - start);
}

function monthsLeftBadge(log: BreakawayLog) {
  if (log.status !== 'ACTIVE') {
    return <Badge className="bg-gray-100 text-gray-600 text-xs">Đã hết hiệu lực</Badge>;
  }
  const m = log.monthsRemaining;
  if (m <= 1) return <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs"><AlertTriangle className="w-3 h-3 inline mr-1" />Còn {m} tháng — sắp hết</Badge>;
  if (m <= 3) return <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">Còn {m} tháng</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs">Còn {m} tháng</Badge>;
}

export default function AdminBreakawayLogsPage() {
  const [logs, setLogs] = useState<BreakawayLog[]>([]);
  const [fees, setFees] = useState<BreakFeeResponse | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentDetailFee, setPaymentDetailFee] = useState<BreakFeeRecord | null>(null);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [month]);

  const handleProcess = async () => {
    if (!confirm(`Tính phí quản lý sau vượt cấp cho tháng ${month}?`)) return;
    setProcessing(true);
    try {
      const res = await api.adminProcessBreakawayFees(month);
      alert(`Đã tạo ${res.created} record phí quản lý sau vượt cấp`);
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
        <Network size={24} /> Team vượt cấp — Quản lý vượt cấp (C12.4)
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Khi người được dẫn dắt vượt cấp: parent trực tiếp chuyển lên grand-parent. Phí quản lý sau vượt cấp (12 tháng):
        L1 — Người dẫn dắt cấp 1 cũ <b>3%</b>, L2 — Người dẫn dắt cấp 2 cũ <b>2%</b>, L3 — Quỹ phát triển thị trường cho GĐKD <b>1%</b>.
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
          <Play size={16} /> {processing ? 'Đang tính…' : 'Tính phí tháng'}
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <>
          {fees && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">L1 — Người dẫn dắt cấp 1 cũ (3%)</p><p className="text-xl font-bold text-orange-700">{formatVND(fees.byLevel.level1)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">L2 — Người dẫn dắt cấp 2 cũ (2%)</p><p className="text-xl font-bold text-amber-700">{formatVND(fees.byLevel.level2)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">L3 — Quỹ phát triển TT · GĐKD (1%)</p><p className="text-xl font-bold text-indigo-700">{formatVND(fees.byLevel.level3)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng tháng</p><p className="text-xl font-bold">{formatVND(fees.total)}</p></CardContent></Card>
            </div>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Các nhánh vượt cấp ({logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có nhánh vượt cấp</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b bg-gray-50">
                      <tr>
                        <th className="py-2 px-2">Người vượt cấp</th>
                        <th className="py-2 px-2">Người dẫn dắt cấp 1 cũ</th>
                        <th className="py-2 px-2">Người dẫn dắt cấp 2 cũ (→ parent mới)</th>
                        <th className="py-2 px-2">Ngày vượt cấp</th>
                        <th className="py-2 px-2 min-w-[180px]">
                          <span className="flex items-center gap-1"><Timer size={14} /> Tiến trình 12 tháng</span>
                        </th>
                        <th className="py-2 px-2">Còn lại</th>
                        <th className="py-2 px-2">Cảnh báo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => {
                        const p = progressOf(l.breakawayAt, l.expireAt);
                        const pct = Math.round(p * 100);
                        const barColor = l.status !== 'ACTIVE' ? 'bg-gray-300'
                          : p >= 0.9 ? 'bg-red-500'
                          : p >= 0.75 ? 'bg-amber-500'
                          : 'bg-emerald-500';
                        const isExpiring = l.status === 'ACTIVE' && l.monthsRemaining <= 1;
                        return (
                          <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50/60">
                            <td className="py-2 px-2">{l.user.name} <span className="text-slate-500">({l.user.rank})</span></td>
                            <td className="py-2 px-2">{l.oldParent.name}</td>
                            <td className="py-2 px-2">{l.newParent.name}</td>
                            <td className="py-2 px-2 text-xs text-slate-500">{new Date(l.breakawayAt).toLocaleDateString('vi-VN')}</td>
                            <td className="py-2 px-2">
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-2 ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{pct}% · Hết hạn: {new Date(l.expireAt).toLocaleDateString('vi-VN')}</div>
                            </td>
                            <td className="py-2 px-2">{monthsLeftBadge(l)}</td>
                            <td className="py-2 px-2">
                              {isExpiring ? (
                                <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs">
                                  <AlertTriangle className="w-3 h-3 inline mr-1" /> Sắp hết 12 tháng
                                </Badge>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {fees && fees.records.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Phí quản lý sau vượt cấp · tháng {month} ({fees.records.length} dòng)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b bg-gray-50">
                      <tr>
                        <th className="py-2 px-2">Level</th>
                        <th className="py-2 px-2">Người vượt cấp</th>
                        <th className="py-2 px-2">Người nhận</th>
                        <th className="py-2 px-2 text-right">Phí</th>
                        <th className="py-2 px-2">Trạng thái</th>
                        <th className="py-2 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {fees.records.map((r) => {
                        const label = r.level === 3
                          ? 'L3 — Quỹ PTTT'
                          : r.level === 2
                            ? 'L2 — Cấp 2 cũ'
                            : 'L1 — Cấp 1 cũ';
                        const levelClass =
                          r.level === 3 ? 'bg-indigo-100 text-indigo-700' :
                          r.level === 2 ? 'bg-amber-100 text-amber-700' :
                          'bg-orange-100 text-orange-700';
                        return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50/60">
                            <td className="py-2 px-2"><Badge className={`${levelClass} text-xs`}>{label}</Badge></td>
                            <td className="py-2 px-2">{r.fromUser.name}</td>
                            <td className="py-2 px-2">{r.toUser.name} <span className="text-slate-500">({r.toUser.rank})</span></td>
                            <td className="py-2 px-2 text-right font-mono font-semibold">
                              <button
                                type="button"
                                className="hover:underline text-left w-full"
                                onClick={() => setPaymentDetailFee(r)}
                                title="Xem chi tiết thanh toán"
                              >
                                {formatVND(r.amount)}
                              </button>
                            </td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Payment detail mini-dialog (P2) */}
      {paymentDetailFee && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPaymentDetailFee(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-96 max-w-[90vw] space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Chi tiết khoản phí #{paymentDetailFee.id}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Level:</span> <span className="font-medium">L{paymentDetailFee.level}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tháng:</span> <span className="font-medium">{paymentDetailFee.month}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số tiền:</span> <span className="font-semibold">{formatVND(paymentDetailFee.amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span>
                <Badge className={paymentDetailFee.status === 'PAID' ? 'bg-green-100 text-green-700 text-xs' : 'bg-yellow-100 text-yellow-700 text-xs'}>
                  {paymentDetailFee.status}
                </Badge>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Từ (người vượt cấp):</span> <span className="font-medium">{paymentDetailFee.fromUser.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Đến (người nhận):</span> <span className="font-medium">{paymentDetailFee.toUser.name} ({paymentDetailFee.toUser.rank})</span></div>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-xs text-gray-500">
              Chi tiết phương thức thanh toán, mã giao dịch và chứng từ sẽ được cập nhật khi Admin bấm &ldquo;Đã trả&rdquo;
              (TODO: mở rộng bảng BreakawayFee với paidAt / paymentMethod / reference).
            </div>
            <button
              onClick={() => setPaymentDetailFee(null)}
              className="w-full py-2 border rounded-lg hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
