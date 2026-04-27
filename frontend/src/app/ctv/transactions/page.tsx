'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Clock, CheckCircle, XCircle } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
};

export default function CtvTransactions() {
  const [tab, setTab] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = async (p = 1, status = tab) => {
    setLoading(true);
    try {
      const data = await api.ctvTransactionHistory(p, status || undefined);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(1, tab); }, [tab]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart size={24} /> Giao dịch ({total})
      </h2>

      <div className="flex gap-2 mb-4">
        <Button variant={tab === '' ? 'default' : 'outline'} size="sm" onClick={() => setTab('')}>Tất cả</Button>
        <Button variant={tab === 'PENDING' ? 'default' : 'outline'} size="sm" onClick={() => setTab('PENDING')}>
          <Clock size={14} className="mr-1" /> Chờ duyệt
        </Button>
        <Button variant={tab === 'CONFIRMED' ? 'default' : 'outline'} size="sm" onClick={() => setTab('CONFIRMED')}>
          <CheckCircle size={14} className="mr-1" /> Đã duyệt
        </Button>
        <Button variant={tab === 'REJECTED' ? 'default' : 'outline'} size="sm" onClick={() => setTab('REJECTED')}>
          <XCircle size={14} className="mr-1" /> Từ chối
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />)}</div>
      ) : transactions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">Không có giao dịch</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="hidden sm:table-cell">PT</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
                  <TableHead className="hidden lg:table-cell">Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => {
                  const sc = statusConfig[tx.status] || statusConfig.PENDING;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono">#{tx.id}</TableCell>
                      <TableCell>{tx.customer?.name || '-'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatVND(tx.totalAmount)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {tx.paymentMethod === 'bank_transfer' ? (
                          <Badge variant="outline">CK {tx.bankCode ? `(${tx.bankCode})` : ''}</Badge>
                        ) : tx.paymentMethod === 'cash' ? (
                          <Badge variant="secondary">Tiền mặt</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={sc.color} variant="outline">{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-500 max-w-[150px] truncate">
                        {tx.rejectedReason || (tx.paymentProof ? 'Có bằng chứng' : '')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchData(page - 1)}>Trước</Button>
          <span className="flex items-center text-sm text-slate-500">Trang {page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>Sau</Button>
        </div>
      )}
    </>
  );
}
