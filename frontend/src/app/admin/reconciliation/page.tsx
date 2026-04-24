'use client';

import { useState } from 'react';
import { formatVND } from '@/lib/api';
import { useReconciliationActions, useReconciliationData } from '@/lib/hooks/useApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, Banknote, CreditCard, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function AdminReconciliation() {
  const [tab, setTab] = useState<'pending' | 'cash'>('pending');
  const [filter, setFilter] = useState('');
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewProof, setViewProof] = useState<string | null>(null);

  const { pending, stats, cash } = useReconciliationData(filter);
  const { confirm, reject, confirmDeposit } = useReconciliationActions();

  const transactions: any[] = pending.data?.transactions ?? [];
  const cashDeposits: any[] = cash.data ?? [];
  const statsData = stats.data;
  const loading = pending.isLoading || stats.isLoading || cash.isLoading;
  const actionLoadingId =
    confirm.isPending ? (confirm.variables as number) :
    reject.isPending ? (reject.variables as { id: number } | undefined)?.id :
    confirmDeposit.isPending ? (confirmDeposit.variables as number) :
    null;

  const handleConfirm = (id: number) => confirm.mutate(id);
  const handleReject = () => {
    if (!rejectId || !rejectReason) return;
    reject.mutate({ id: rejectId, reason: rejectReason }, {
      onSuccess: () => { setRejectId(null); setRejectReason(''); },
    });
  };
  const handleConfirmDeposit = (id: number) => confirmDeposit.mutate(id);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ClipboardCheck size={24} /> Đối soát giao dịch
      </h2>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">Giao dịch chờ duyệt</p>
              <p className="text-2xl font-bold text-yellow-600">{statsData.pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">Tổng tiền chờ</p>
              <p className="text-2xl font-bold text-emerald-600">{formatVND(statsData.pendingAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">Thời gian chờ TB</p>
              <p className="text-2xl font-bold">{statsData.avgConfirmTimeHours}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">Phiếu nộp tiền chờ</p>
              <p className="text-2xl font-bold text-blue-600">{statsData.pendingDeposits}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button variant={tab === 'pending' ? 'default' : 'outline'} onClick={() => setTab('pending')}>
          <CreditCard size={16} className="mr-1" /> Giao dịch ({transactions.length})
        </Button>
        <Button variant={tab === 'cash' ? 'default' : 'outline'} onClick={() => setTab('cash')}>
          <Banknote size={16} className="mr-1" /> Nộp tiền mặt ({cashDeposits.length})
        </Button>
      </div>

      {/* Filter */}
      {tab === 'pending' && (
        <div className="flex gap-2 mb-4">
          <Button variant={!filter ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('')}>Tất cả</Button>
          <Button variant={filter === 'bank_transfer' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('bank_transfer')}>Chuyển khoản</Button>
          <Button variant={filter === 'cash' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('cash')}>Tiền mặt</Button>
          <Button variant={filter === 'momo' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('momo')}>Momo</Button>
          <Button variant={filter === 'zalopay' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('zalopay')}>ZaloPay</Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />)}</div>
      ) : tab === 'pending' ? (
        /* Pending transactions table */
        transactions.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-slate-500">Không có giao dịch chờ duyệt</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>CTV</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Phương thức</TableHead>
                    <TableHead>Ngân hàng</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Chứng từ</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono">#{tx.id}</TableCell>
                      <TableCell>{tx.ctv?.name}</TableCell>
                      <TableCell>{tx.customer?.name || '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(tx.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.paymentMethod === 'bank_transfer' ? 'default' : 'secondary'}>
                          {tx.paymentMethod === 'bank_transfer' ? 'Chuyển khoản'
                            : tx.paymentMethod === 'cash' ? 'Tiền mặt'
                            : tx.paymentMethod === 'momo' ? 'Momo'
                            : tx.paymentMethod === 'zalopay' ? 'ZaloPay'
                            : tx.paymentMethod || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{tx.bankCode || '—'}</TableCell>
                      <TableCell className="text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>
                        {tx.paymentProof ? (
                          <Button variant="ghost" size="sm" title="Xem chứng từ" onClick={() => setViewProof(`http://localhost:4000${tx.paymentProof.imageUrl}`)}>
                            <Eye size={14} />
                          </Button>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleConfirm(tx.id)} disabled={actionLoadingId === tx.id}>
                            <CheckCircle size={14} className="mr-1" /> Duyệt
                          </Button>
                          <Button size="sm" variant="destructive" title="Từ chối" onClick={() => { setRejectId(tx.id); setRejectReason(''); }}>
                            <XCircle size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : (
        /* Cash deposits tab */
        cashDeposits.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-slate-500">Không có phiếu nộp tiền chờ duyệt</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {cashDeposits.map((dep: any) => (
              <Card key={dep.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Phiếu #{dep.id} · CTV: {dep.ctv?.name}</p>
                    <p className="text-sm text-slate-500">
                      {dep.transactionIds?.length || 0} giao dịch · Nộp lúc: {new Date(dep.depositedAt).toLocaleString('vi-VN')}
                    </p>
                    {dep.notes && <p className="text-xs text-slate-400">Ghi chú: {dep.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold text-emerald-600">{formatVND(dep.amount)}</p>
                    <Button size="sm" onClick={() => handleConfirmDeposit(dep.id)} disabled={actionLoadingId === dep.id}>
                      <CheckCircle size={14} className="mr-1" /> Xác nhận
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Từ chối giao dịch #{rejectId}</h3>
            <Input
              placeholder="Lý do từ chối…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)} className="flex-1">Huỷ</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason} className="flex-1">Từ chối</Button>
            </div>
          </div>
        </div>
      )}

      {/* Proof viewer modal */}
      {viewProof && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewProof(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewProof} alt="Chứng từ thanh toán" className="w-full rounded" />
            <Button variant="outline" onClick={() => setViewProof(null)} className="mt-3 w-full">Đóng</Button>
          </div>
        </div>
      )}
    </>
  );
}
