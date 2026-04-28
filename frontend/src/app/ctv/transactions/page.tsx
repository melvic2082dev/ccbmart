'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Clock, CheckCircle, XCircle, Search } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
};

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt:desc', label: 'Mới nhất' },
  { value: 'createdAt:asc', label: 'Cũ nhất' },
  { value: 'totalAmount:desc', label: 'Số tiền cao → thấp' },
  { value: 'totalAmount:asc', label: 'Số tiền thấp → cao' },
];

export default function CtvTransactions() {
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Debounce search input — wait 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const [sortBy, sortDir] = sort.split(':');
      const data = await api.ctvTransactionHistory(p, {
        status: tab || undefined,
        search: debouncedSearch || undefined,
        paymentMethod: paymentMethod || undefined,
        sortBy,
        sortDir,
      });
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(1); }, [tab, debouncedSearch, paymentMethod, sort]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart size={24} /> Giao dịch ({total})
      </h2>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên KH, SĐT, hoặc #ID"
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto">
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

      <div className="flex gap-2 mb-4">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
          aria-label="Sắp xếp"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
          aria-label="Phương thức thanh toán"
        >
          <option value="">Tất cả PT</option>
          <option value="bank_transfer">Chuyển khoản</option>
          <option value="cash">Tiền mặt</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />)}</div>
      ) : transactions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">Không có giao dịch</CardContent></Card>
      ) : (
        <>
          {/* Mobile: compact 2-line cards */}
          <div className="md:hidden flex flex-col gap-2">
            {transactions.map((tx: any) => {
              const sc = statusConfig[tx.status] || statusConfig.PENDING;
              const pt = tx.paymentMethod === 'bank_transfer'
                ? `CK${tx.bankCode ? ` ${tx.bankCode}` : ''}`
                : tx.paymentMethod === 'cash' ? 'Tiền mặt' : '';
              const note = tx.rejectedReason || (tx.paymentProof ? 'Có bằng chứng' : '');
              return (
                <Card key={tx.id}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0 flex items-baseline gap-2">
                        <span className="font-mono text-xs text-muted-foreground shrink-0">#{tx.id}</span>
                        <span className="font-medium truncate">{tx.customer?.name || '-'}</span>
                      </div>
                      <span className="font-semibold tabular-nums shrink-0">{formatVND(tx.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge className={sc.color} variant="outline">{sc.label}</Badge>
                        {pt && <span className="truncate">{pt}</span>}
                      </div>
                      <span className="shrink-0 tabular-nums">{new Date(tx.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    {note && <p className="text-xs text-muted-foreground truncate">{note}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: full table */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>PT</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
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
                        <TableCell>
                          {tx.paymentMethod === 'bank_transfer' ? (
                            <Badge variant="outline">CK {tx.bankCode ? `(${tx.bankCode})` : ''}</Badge>
                          ) : tx.paymentMethod === 'cash' ? (
                            <Badge variant="secondary">Tiền mặt</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={sc.color} variant="outline">{sc.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</TableCell>
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
        </>
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
