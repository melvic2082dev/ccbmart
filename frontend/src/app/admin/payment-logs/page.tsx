'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, CheckCircle2, AlertCircle } from 'lucide-react';

interface InvoiceRow {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  issuedAt: string;
  fromParty: string;
  payoutType: string | null;
  month: string | null;
  description: string | null;
  toUser: { id: number; name: string; rank: string };
}

interface PayoutLogRow {
  id: number;
  partnerId: number;
  partnerName: string;
  partnerRank: string;
  month: string;
  totalAmount: number | string;
  breakdown: { type: string; amount: number }[];
  hasValidLog: boolean;
  kFactor: number | string;
  status: string;
  processedAt: string;
}

const PAYOUT_TYPE_LABEL: Record<string, string> = {
  SALES_COMMISSION: 'Hoa hồng bán lẻ',
  MAINTENANCE_FEE: 'Lương cố định',
  MANAGEMENT_FEE_LEVEL1: 'Phí quản lý cấp 1',
  MANAGEMENT_FEE_LEVEL2: 'Phí quản lý cấp 2',
  MANAGEMENT_FEE_LEVEL3: 'Phí quản lý cấp 3',
  OVERRIDE_FEE: 'Phí thoát ly',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  SENT: 'Đã gửi',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminPaymentLogsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payoutLogs, setPayoutLogs] = useState<PayoutLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.adminInvoices(1).catch(() => ({ invoices: [] })),
      api.adminPaymentLogs({ month }).catch(() => ({ logs: [] })),
    ])
      .then(([invRes, logRes]) => {
        setInvoices(invRes.invoices || []);
        setPayoutLogs(logRes.logs || []);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const filteredInvoices = useMemo(
    () => invoices.filter(inv => !inv.month || inv.month === month),
    [invoices, month]
  );

  const totalDisbursed = payoutLogs.reduce((s, l) => s + Number(l.totalAmount || 0), 0);
  const partnersWithLog = payoutLogs.filter(l => l.hasValidLog).length;
  const avgKFactor = payoutLogs.length > 0
    ? payoutLogs.reduce((s, l) => s + Number(l.kFactor || 1), 0) / payoutLogs.length
    : 1;

  return (
    <>
      <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
        <Banknote size={24} /> Nhật ký thanh toán
      </h2>

      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-900">
        <span className="font-medium">CCB Mart là bên chi trả duy nhất.</span> Mọi khoản thanh toán đều được phát hành từ Công ty CP CCB tới đối tác (PP, TP, GĐV, GĐKD).
      </div>

      <div className="mb-4 flex gap-3 items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Đối tác đã chi</p><p className="text-xl font-bold">{payoutLogs.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Đạt log 20h</p><p className="text-xl font-bold text-emerald-700">{partnersWithLog}/{payoutLogs.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Tổng chi</p><p className="text-xl font-bold">{formatVND(totalDisbursed)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Hệ số K trung bình</p><p className="text-xl font-bold">{avgKFactor.toFixed(2)}</p></CardContent></Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tổng hợp payout theo đối tác ({payoutLogs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payoutLogs.length === 0 ? (
                <p className="text-sm text-slate-500 px-4 py-6">Chưa có payout cho tháng này. Vào trang Phí quản lý → Tính lại tháng.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Đối tác</TableHead>
                          <TableHead>Xếp hạng</TableHead>
                          <TableHead>Tháng</TableHead>
                          <TableHead className="text-right">Tổng</TableHead>
                          <TableHead className="text-center">Log 20h</TableHead>
                          <TableHead className="text-right">K-factor</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payoutLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.partnerName}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{log.partnerRank}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{log.month}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{formatVND(Number(log.totalAmount) || 0)}</TableCell>
                            <TableCell className="text-center">
                              {log.hasValidLog ? <CheckCircle2 className="w-4 h-4 text-green-600 inline" /> : <AlertCircle className="w-4 h-4 text-amber-500 inline" />}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">{Number(log.kFactor).toFixed(2)}</TableCell>
                            <TableCell><Badge className="bg-green-100 text-green-700">{log.status === 'PROCESSED' ? 'Đã xử lý' : log.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile compact card */}
                  <div className="md:hidden p-3 space-y-2">
                    {payoutLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs shrink-0">{log.partnerRank}</Badge>
                            <p className="font-medium text-gray-800 truncate">{log.partnerName}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 text-xs shrink-0">{log.status === 'PROCESSED' ? 'Đã xử lý' : log.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-mono text-xs text-gray-500">{log.month}</span>
                          <p className="font-bold text-emerald-700 tabular-nums">{formatVND(Number(log.totalAmount) || 0)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 pt-2 border-t">
                          <span className="flex items-center gap-1">
                            Log 20h: {log.hasValidLog ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                          </span>
                          <span>K-factor: <span className="font-mono font-semibold text-gray-700">{Number(log.kFactor).toFixed(2)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chi tiết hóa đơn ({filteredInvoices.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredInvoices.length === 0 ? (
                <p className="text-sm text-slate-500 px-4 py-6">Chưa có hóa đơn cho tháng này.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày</TableHead>
                          <TableHead>Bên chuyển</TableHead>
                          <TableHead>Bên nhận</TableHead>
                          <TableHead className="text-right">Số tiền</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Hóa đơn</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="text-sm">{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</TableCell>
                            <TableCell><span className="font-medium">{inv.fromParty || 'CCB Mart'}</span></TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{inv.toUser.name}</div>
                              <Badge variant="outline" className="text-xs">{inv.toUser.rank}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">{formatVND(Number(inv.amount) || 0)}</TableCell>
                            <TableCell>
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                {PAYOUT_TYPE_LABEL[inv.payoutType ?? ''] ?? inv.payoutType ?? '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                            <TableCell><Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABEL[inv.status] ?? inv.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile compact card */}
                  <div className="md:hidden p-3 space-y-2">
                    {filteredInvoices.map((inv) => (
                      <div key={inv.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</span>
                          <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABEL[inv.status] ?? inv.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 truncate">{inv.toUser.name}</p>
                            <p className="text-xs text-gray-500">
                              <Badge variant="outline" className="text-[10px] py-0">{inv.toUser.rank}</Badge>
                              {' '}· {new Date(inv.issuedAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                          <p className="font-bold text-emerald-700 shrink-0 tabular-nums">{formatVND(Number(inv.amount) || 0)}</p>
                        </div>
                        <div className="flex items-center pt-2 border-t">
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            {PAYOUT_TYPE_LABEL[inv.payoutType ?? ''] ?? inv.payoutType ?? '—'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
