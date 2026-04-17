'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Transfer {
  id: number;
  amount: number;
  transferDate: string;
  status: string;
  errorMessage: string | null;
  reference: number | null;
  fromUser: { id: number; name: string; rank: string };
  toUser: { id: number; name: string; rank: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUCCESS: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const load = () => {
    setLoading(true);
    api.adminTransfers(1, filter || undefined)
      .then((d) => setTransfers(d.transfers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [filter]);

  const handleRetry = async (id: number) => {
    try {
      // TODO: replace with real retry API
      await new Promise(r => setTimeout(r, 400));
      alert(`Đã gửi yêu cầu chạy lại transfer #${id}`);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleRetryAll = async () => {
    const failed = transfers.filter(t => t.status === 'FAILED');
    if (failed.length === 0) return;
    if (!confirm(`Chạy lại ${failed.length} giao dịch FAILED?`)) return;
    try {
      // TODO: replace with real bulk-retry API
      await new Promise(r => setTimeout(r, 600));
      alert(`Đã gửi yêu cầu chạy lại ${failed.length} giao dịch`);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const totalSuccess = transfers.filter((t) => t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0);
  const failedCount = transfers.filter((t) => t.status === 'FAILED').length;

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
        <Banknote size={24} /> Nhật ký Auto Transfer
      </h2>

      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-900 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          <b>Bên chuyển</b> = CCB Mart (hệ thống tự động). <b>Bên nhận</b> = đối tác (CTV/HKD/Đại lý).
          Auto Transfer là tầng trung gian giữa Partner Payout Engine và cổng ngân hàng.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Tổng chuyển khoản SUCCESS</p>
            <p className="text-2xl font-bold text-emerald-700">{formatVND(totalSuccess)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Số bản ghi thất bại</p>
            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Tổng bản ghi</p>
            <p className="text-2xl font-bold">{transfers.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 items-center">
        {['', 'PENDING', 'SUCCESS', 'FAILED'].map((s) => (
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
        {failedCount > 0 && (
          <Button variant="destructive" size="sm" onClick={handleRetryAll} className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-1" /> Retry tất cả FAILED ({failedCount})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách chuyển khoản ({transfers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Bên chuyển</TableHead>
                  <TableHead>Bên nhận</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Ref Invoice</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Lỗi</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{new Date(t.transferDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{t.fromUser.name}</div>
                      <Badge variant="outline" className="text-xs">{t.fromUser.rank}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{t.toUser.name}</div>
                      <Badge variant="outline" className="text-xs">{t.toUser.rank}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {t.amount > 0 ? formatVND(t.amount) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.reference ? `#${t.reference}` : '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[t.status]}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                      {t.errorMessage || '—'}
                    </TableCell>
                    <TableCell>
                      {t.status === 'FAILED' && (
                        <Button variant="outline" size="sm" onClick={() => handleRetry(t.id)}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {transfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Chưa có giao dịch
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
