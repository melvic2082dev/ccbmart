'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Play } from 'lucide-react';

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  feeTier: string;
  status: string;
  issuedAt: string;
  pdfUrl: string | null;
  fromUser: { id: number; name: string; rank: string };
  toUser: { id: number; name: string; rank: string };
  contract: { id: number; contractNo: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');

  const fetchData = () => {
    setLoading(true);
    api.adminInvoices(1, filter || undefined)
      .then((d) => setInvoices(d.invoices || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filter]);

  const runMonthly = async () => {
    setProcessing(true);
    setMessage('');
    try {
      const now = new Date();
      const r = await api.adminProcessMonthlyTransfer(now.getMonth() + 1, now.getFullYear());
      setMessage(`Đã tạo ${r.invoicesCreated} hóa đơn, ${r.transfersCreated} chuyển khoản, tổng ${formatVND(r.totalAmount)}`);
      fetchData();
    } catch (err) {
      setMessage(`Lỗi: ${(err as Error).message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText size={24} /> Hóa đơn điện tử (V12.2)
      </h2>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['', 'DRAFT', 'SENT', 'PAID', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === '' ? 'Tất cả' : s}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={runMonthly}
            disabled={processing}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={16} /> {processing ? 'Đang chạy...' : 'Chạy auto-transfer tháng này'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">{message}</div>
      )}

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách hóa đơn ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số hóa đơn</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Bên trả</TableHead>
                  <TableHead>Bên nhận</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hợp đồng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{inv.fromUser.name}</div>
                      <Badge variant="outline" className="text-xs">{inv.fromUser.rank}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{inv.toUser.name}</div>
                      <Badge variant="outline" className="text-xs">{inv.toUser.rank}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-700">{inv.feeTier}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-emerald-700">
                      {formatVND(inv.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[inv.status]}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{inv.contract?.contractNo || '-'}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Chưa có hóa đơn
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
