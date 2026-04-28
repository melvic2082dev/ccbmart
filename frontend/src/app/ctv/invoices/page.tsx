'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split('-');
  return `Tháng ${parseInt(m, 10)}/${y}`;
}

function monthKeyOf(inv: Invoice) {
  if (inv.month) return inv.month;
  const d = new Date(inv.issuedAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CtvInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    api.ctvInvoices()
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoices) set.add(monthKeyOf(inv));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [invoices]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoices) if (inv.payoutType) set.add(inv.payoutType);
    return Array.from(set).sort();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (monthFilter !== 'ALL' && monthKeyOf(inv) !== monthFilter) return false;
      if (typeFilter !== 'ALL' && (inv.payoutType ?? '') !== typeFilter) return false;
      return true;
    });
  }, [invoices, monthFilter, typeFilter]);

  const totalReceived = filteredInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const hasFilter = monthFilter !== 'ALL' || typeFilter !== 'ALL';

  // Group by month, latest first.
  const grouped = useMemo(() => {
    const buckets = new Map<string, Invoice[]>();
    for (const inv of filteredInvoices) {
      const key = monthKeyOf(inv);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(inv);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filteredInvoices]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText size={24} /> Hóa đơn của tôi
      </h2>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
          aria-label="Lọc theo tháng"
        >
          <option value="ALL">Mọi tháng</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
          aria-label="Lọc theo loại"
        >
          <option value="ALL">Mọi loại</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{PAYOUT_TYPE_LABEL[t] ?? t}</option>
          ))}
        </select>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm text-slate-500">{hasFilter ? 'Tổng đã lọc' : 'Tổng đã nhận từ CCB Mart'}</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatVND(totalReceived)}</p>
          <p className="text-xs text-slate-500 mt-1">{filteredInvoices.length} hóa đơn</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">Chưa có hóa đơn</CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">Không có hóa đơn phù hợp với bộ lọc</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([monthKey, items]) => {
            const monthTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
            return (
              <Card key={monthKey}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                    <span>
                      {monthLabel(monthKey)}{' '}
                      <span className="text-sm font-normal text-muted-foreground">({items.length} hóa đơn)</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatVND(monthTotal)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {items.map((inv, idx) => (
                      <li
                        key={inv.id}
                        className={`px-4 py-3 ${idx % 2 === 0 ? 'bg-slate-50/40 dark:bg-slate-50/40' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</p>
                            <Badge className="bg-purple-100 text-purple-700">
                              {PAYOUT_TYPE_LABEL[inv.payoutType ?? ''] ?? inv.payoutType ?? inv.feeTier}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {new Date(inv.issuedAt).toLocaleDateString('vi-VN')} · {inv.fromParty || 'CCB Mart'}
                            </p>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <p className="font-semibold tabular-nums">{formatVND(Number(inv.amount) || 0)}</p>
                            <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABEL[inv.status] ?? inv.status}</Badge>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
