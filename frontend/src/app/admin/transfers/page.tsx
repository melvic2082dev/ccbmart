'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Transfer {
  id: number;
  amount: number | string;
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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
};

type ConfirmState =
  | { kind: 'idle' }
  | { kind: 'retry-all'; count: number }
  | { kind: 'error'; message: string };

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ kind: 'idle' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.adminTransfers(1, filter || undefined)
      .then((d) => setTransfers(d.transfers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [filter]);

  const showError = (message: string) => setConfirmState({ kind: 'error', message });

  const handleRetry = async (id: number) => {
    try {
      await api.adminTransferRetry(id);
      load();
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const handleRetryAll = () => {
    const count = transfers.filter((t) => t.status === 'FAILED').length;
    if (count === 0) return;
    setConfirmState({ kind: 'retry-all', count });
  };

  const confirmRetryAll = async () => {
    setSubmitting(true);
    try {
      const failed = transfers.filter((t) => t.status === 'FAILED');
      await Promise.all(failed.map((t) => api.adminTransferRetry(t.id)));
      setConfirmState({ kind: 'idle' });
      load();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSuccess = transfers
    .filter((t) => t.status === 'SUCCESS')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const failedCount = transfers.filter((t) => t.status === 'FAILED').length;

  return (
    <>
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
            <p className="text-sm text-slate-500">Tổng chuyển khoản thành công</p>
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
            {s === '' ? 'Tất cả' : STATUS_LABELS[s] || s}
          </button>
        ))}
        {failedCount > 0 && (
          <Button variant="destructive" size="sm" onClick={handleRetryAll} className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-1" /> Chạy lại tất cả giao dịch thất bại ({failedCount})
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
                  <TableHead>Tham chiếu hóa đơn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Lỗi</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => {
                  const amt = Number(t.amount || 0);
                  return (
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
                        {amt > 0 ? formatVND(amt) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.reference ? `#${t.reference}` : '—'}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[t.status]}>{STATUS_LABELS[t.status] || t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                        {t.errorMessage || '—'}
                      </TableCell>
                      <TableCell>
                        {t.status === 'FAILED' && (
                          <Button variant="outline" size="sm" onClick={() => handleRetry(t.id)}>
                            <RefreshCw className="w-3 h-3 mr-1" /> Chạy lại
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      <Dialog
        open={confirmState.kind === 'retry-all'}
        onOpenChange={(open) => !open && setConfirmState({ kind: 'idle' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chạy lại giao dịch thất bại?</DialogTitle>
            <DialogDescription>
              {confirmState.kind === 'retry-all' && (
                <>Sẽ chạy lại <b>{confirmState.count}</b> giao dịch đang ở trạng thái thất bại. Tiếp tục?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmState({ kind: 'idle' })}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button onClick={confirmRetryAll} disabled={submitting}>
              {submitting ? 'Đang chạy…' : 'Xác nhận chạy lại'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmState.kind === 'error'}
        onOpenChange={(open) => !open && setConfirmState({ kind: 'idle' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Có lỗi xảy ra</DialogTitle>
            <DialogDescription>
              {confirmState.kind === 'error' && confirmState.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmState({ kind: 'idle' })}>Đã hiểu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
