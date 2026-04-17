'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Play, Info, FileText } from 'lucide-react';

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

const LEVEL_LABEL: Record<number, string> = {
  1: 'Cấp 1 (10%)',
  2: 'Cấp 2 (5%)',
  3: 'Cấp 3 (3%)',
};
const LEVEL_COLOR: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
};

// Mock: payment log for a fee row (TODO: replace with real API)
interface PaymentInfo {
  paidAt?: string | null;
  reference?: string | null;
  method?: string | null;
}
function mockPaymentInfo(feeId: number, status: string): PaymentInfo {
  if (status !== 'PAID') return { paidAt: null, reference: null, method: null };
  // Deterministic mock derived from feeId
  const day = 1 + (feeId % 28);
  const now = new Date();
  const paidAt = new Date(now.getFullYear(), now.getMonth(), day, 9, 30).toISOString();
  return {
    paidAt,
    reference: `CT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(feeId).padStart(5, '0')}`,
    method: 'Chuyển khoản',
  };
}

export default function AdminManagementFeesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<AdminMgmtFeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [openTrainingLogsFor, setOpenTrainingLogsFor] = useState<string | null>(null);

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
      <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
        <Coins size={24} /> Phí quản lý theo cấp dẫn dắt
      </h2>

      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-900 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Phí quản lý do CCB Mart chi trả trực tiếp từ doanh thu bán hàng. Không có chuyển tiền giữa đối tác.</span>
      </div>

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
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng Cấp 1 (10%)</p><p className="text-xl font-bold text-emerald-700">{formatVND(data.byLevel.f1)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng Cấp 2 (5%)</p><p className="text-xl font-bold text-blue-700">{formatVND(data.byLevel.f2)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng Cấp 3 (3%)</p><p className="text-xl font-bold text-purple-700">{formatVND(data.byLevel.f3)}</p></CardContent></Card>
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
                    <thead className="text-left border-b bg-gray-50">
                      <tr>
                        <th className="py-2 px-2">Tháng</th>
                        <th className="py-2 px-2">Cấp</th>
                        <th className="py-2 px-2">Người được dẫn dắt</th>
                        <th className="py-2 px-2">Người dẫn dắt</th>
                        <th className="py-2 px-2 text-right">Phí</th>
                        <th className="py-2 px-2">Trạng thái</th>
                        <th className="py-2 px-2">Ngày chi trả</th>
                        <th className="py-2 px-2">Số chứng từ</th>
                        <th className="py-2 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r) => {
                        const pi = mockPaymentInfo(r.id, r.status);
                        return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50/60">
                            <td className="py-2 px-2 font-mono text-xs">{r.month}</td>
                            <td className="py-2 px-2"><Badge className={`${LEVEL_COLOR[r.level]} text-xs`}>{LEVEL_LABEL[r.level]}</Badge></td>
                            <td className="py-2 px-2">{r.fromUser.name} <span className="text-slate-500 text-xs">({r.fromUser.rank || 'CTV'})</span></td>
                            <td className="py-2 px-2">{r.toUser.name} <span className="text-slate-500 text-xs">({r.toUser.rank})</span></td>
                            <td className="py-2 px-2 text-right font-mono font-semibold">{formatVND(r.amount)}</td>
                            <td className="py-2 px-2">
                              <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{r.status}</Badge>
                            </td>
                            <td className="py-2 px-2 text-xs text-gray-600">
                              {pi.paidAt ? new Date(pi.paidAt).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td className="py-2 px-2 font-mono text-xs text-gray-600">{pi.reference || '—'}</td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1">
                                {r.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleMarkPaid(r.id)}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                  >
                                    Đã trả
                                  </button>
                                )}
                                <button
                                  onClick={() => setOpenTrainingLogsFor(`${r.month}::${r.toUser.name}`)}
                                  title={`Xem log đào tạo ${r.toUser.name} · ${r.month}`}
                                  className="p-1 text-gray-500 hover:text-blue-600"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
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
        </>
      ) : null}

      {/* Training log mini-dialog for a fee row (mock) */}
      {openTrainingLogsFor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpenTrainingLogsFor(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-[440px] max-w-[90vw] space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Log đào tạo kèm theo</h3>
            <p className="text-xs text-gray-500">
              Mentor/Tháng: <b>{openTrainingLogsFor}</b>
            </p>
            <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
              <p>Phí quản lý chỉ được chi trả nếu mentor có đủ <b>20 giờ log đào tạo</b> trong tháng (V13.1 Mục 7.4).</p>
              <p className="text-xs text-gray-500">Chi tiết log đầy đủ có ở màn hình <a className="underline text-blue-600" href="/admin/training-logs">Log đào tạo</a>.</p>
            </div>
            <button
              onClick={() => setOpenTrainingLogsFor(null)}
              className="w-full py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
