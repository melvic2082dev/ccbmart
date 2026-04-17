'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND, getUser } from '@/lib/api';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = any;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';

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

export default function CtvInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser() as AnyUser;
  const myId: number | undefined = user?.id;

  useEffect(() => {
    api.ctvInvoices()
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const received = invoices.filter((i) => i.toUser.id === myId);
  const paid = invoices.filter((i) => i.fromUser.id === myId);
  const totalReceived = received.reduce((s, i) => s + i.amount, 0);
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText size={24} /> Hóa đơn của tôi
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Tổng phí DV nhận được</p>
            <p className="text-2xl font-bold text-emerald-700">{formatVND(totalReceived)}</p>
            <p className="text-xs text-slate-500 mt-1">{received.length} hóa đơn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Tổng phí DV đã trả</p>
            <p className="text-2xl font-bold text-red-600">{formatVND(totalPaid)}</p>
            <p className="text-xs text-slate-500 mt-1">{paid.length} hóa đơn</p>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead>Số HĐ</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Đối tác</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const isReceiver = inv.toUser.id === myId;
                  const partner = isReceiver ? inv.fromUser : inv.toUser;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>
                        <Badge className={isReceiver ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {isReceiver ? 'Nhận' : 'Trả'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{partner.name}</div>
                        <Badge variant="outline" className="text-xs">{partner.rank}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-700">{inv.feeTier}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatVND(inv.amount)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[inv.status]}>{inv.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Chưa có hóa đơn
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
