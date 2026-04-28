'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Play, Search, Download, Inbox } from 'lucide-react';

const PAGE_SIZE = 15;

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

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');
  // P0: search + pagination; P1: month filter + export
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const fetchData = () => {
    setLoading(true);
    // Load many for client-side filter/pagination (API still paginates by 1)
    api.adminInvoices(1, filter || undefined)
      .then((d) => setInvoices(d.invoices || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [filter]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [search, monthFilter, filter]);

  // Month options derived from data
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoices) set.add(inv.issuedAt.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(inv => {
      if (q && !inv.invoiceNumber.toLowerCase().includes(q)
           && !inv.toUser.name.toLowerCase().includes(q)
           && !(inv.payoutType || '').toLowerCase().includes(q)) return false;
      if (monthFilter !== 'ALL' && inv.issuedAt.slice(0, 7) !== monthFilter) return false;
      return true;
    });
  }, [invoices, search, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Client-side export to CSV (MVP — backend can replace with xlsx)
  const exportCsv = () => {
    const rows = [
      ['Số hóa đơn', 'Ngày', 'Bên trả', 'Bên nhận', 'Loại payout', 'Số tiền', 'Trạng thái', 'Hợp đồng'],
      ...filtered.map(inv => [
        inv.invoiceNumber,
        new Date(inv.issuedAt).toISOString().slice(0, 10),
        inv.fromParty || 'CCB Mart',
        inv.toUser.name,
        PAYOUT_TYPE_LABEL[inv.payoutType ?? ''] ?? inv.feeTier,
        String(inv.amount),
        inv.status,
        inv.contract?.contractNo || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const runMonthly = async () => {
    setProcessing(true);
    setMessage('');
    try {
      const now = new Date();
      const r = await api.adminProcessMonthlyPayout(now.getMonth() + 1, now.getFullYear());
      setMessage(`Đã xử lý payout cho ${r.partnersProcessed} đối tác · K = ${r.kFactor} · tổng chi ${formatVND(Number(r.totalDisbursed) || 0)}`);
      fetchData();
    } catch (err) {
      setMessage(`Lỗi: ${(err as Error).message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText size={24} /> Hóa đơn điện tử
      </h2>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {['', 'DRAFT', 'SENT', 'PAID', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === '' ? 'Tất cả' : STATUS_LABEL[s] ?? s}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Xuất Excel
          </Button>
          <button
            onClick={runMonthly}
            disabled={processing}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={16} /> {processing ? 'Đang chạy…' : 'Tính payout tháng này'}
          </button>
        </div>
      </div>

      {/* Search + month filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo số HĐ, bên nhận, loại payout…"
            className="pl-8"
          />
        </div>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="ALL">Mọi tháng</option>
          {monthOptions.map(m => <option key={m} value={m}>{`Tháng ${m.slice(5)}/${m.slice(0, 4)}`}</option>)}
        </select>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">{message}</div>
      )}

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách hóa đơn ({filtered.length}/{invoices.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Số hóa đơn</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Bên trả</TableHead>
                    <TableHead>Bên nhận</TableHead>
                    <TableHead title="Loại khoản thanh toán">Loại payout</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hợp đồng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{inv.fromParty || 'CCB Mart'}</div>
                        <Badge variant="outline" className="text-xs">Công ty</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{inv.toUser.name}</div>
                        <Badge variant="outline" className="text-xs">{inv.toUser.rank}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-700" title={inv.payoutType ?? inv.feeTier}>
                          {PAYOUT_TYPE_LABEL[inv.payoutType ?? ''] ?? inv.feeTier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-700">{formatVND(inv.amount)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABEL[inv.status] ?? inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{inv.contract?.contractNo || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">Không có hóa đơn phù hợp</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile compact card */}
            <div className="md:hidden p-3 space-y-2">
              {paged.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-sm">Không có hóa đơn phù hợp</p>
                  <p className="text-xs text-gray-400">Thử đổi bộ lọc hoặc tháng</p>
                </div>
              ) : paged.map((inv) => (
                <div key={inv.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</span>
                    <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABEL[inv.status] ?? inv.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 break-words">{inv.toUser.name}</p>
                      <p className="text-xs text-gray-500">
                        <Badge variant="outline" className="text-[10px] py-0">{inv.toUser.rank}</Badge>
                        {' '}· {new Date(inv.issuedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-700 shrink-0 tabular-nums">{formatVND(inv.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <Badge className="bg-purple-100 text-purple-700 text-xs" title={inv.payoutType ?? inv.feeTier}>
                      {PAYOUT_TYPE_LABEL[inv.payoutType ?? ''] ?? inv.feeTier}
                    </Badge>
                    {inv.contract?.contractNo && <span className="text-xs text-gray-500 truncate">HĐ: {inv.contract.contractNo}</span>}
                  </div>
                </div>
              ))}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <p className="text-gray-500">Trang {page}/{totalPages} · Hiển thị {paged.length} trong {filtered.length}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-gray-400">…</span>}
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau →</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
