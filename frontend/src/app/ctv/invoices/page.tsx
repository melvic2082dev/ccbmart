'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
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
  fromParty: string;
  payoutType: string | null;
  month: string | null;
  description: string | null;
  toUser: { id: number; name: string; rank: string };
  contract: { id: number; contractNo: string } | null;
}

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
  CANCELLED: 'Đã huỷ',
};

const PAYOUT_TYPE_LABEL: Record<string, string> = {
  SALES_COMMISSION: 'Hoa hồng bán lẻ',
  MAINTENANCE_FEE: 'Lương cố định',
  MANAGEMENT_FEE_LEVEL1: 'Phí quản lý cấp 1',
  MANAGEMENT_FEE_LEVEL2: 'Phí quản lý cấp 2',
  MANAGEMENT_FEE_LEVEL3: 'Phí quản lý cấp 3',
  OVERRIDE_FEE: 'Phí thoát ly',
};

export default function CtvInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ctvInvoices()
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalReceived = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText size={24} /> Hóa đơn của tôi
      </h2>

      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm text-slate-500">Tổng đã nhận từ CCB Mart</p>
          <p className="text-2xl font-bold text-emerald-700">{formatVND(totalReceived)}</p>
          <p className="text-xs text-slate-500 mt-1">{invoices.length} hóa đơn</p>
        </CardContent>
      </Card>

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
                  <TableHead>Bên trả</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{inv.fromParty || 'CCB Mart'}</div>
                      <Badge variant="outline" className="text-xs">Công ty</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-700">
                        {PAYOUT_TYPE_LABEL[inv.payoutType ?? ''] ?? inv.payoutType ?? inv.feeTier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatVND(Number(inv.amount) || 0)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABEL[inv.status] ?? inv.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
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
