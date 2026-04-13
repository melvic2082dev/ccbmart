'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, Clock, Banknote, CreditCard, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function AdminReconciliation() {
  const [tab, setTab] = useState<'pending' | 'cash'>('pending');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cashDeposits, setCashDeposits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewProof, setViewProof] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, statsRes, cashRes] = await Promise.all([
        api.adminReconciliationPending(1, filter || undefined),
        api.adminReconciliationStats(),
        api.adminCashDepositsPending(),
      ]);
      setTransactions(pendingRes.transactions || []);
      setStats(statsRes);
      setCashDeposits(cashRes || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleConfirm = async (id: number) => {
    setActionLoading(id);
    try {
      await api.adminReconciliationConfirm(id);
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    setActionLoading(rejectId);
    try {
      await api.adminReconciliationReject(rejectId, rejectReason);
      setRejectId(null);
      setRejectReason('');
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleConfirmDeposit = async (id: number) => {
    setActionLoading(id);
    try {
      await api.adminCashDepositConfirm(id);
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ClipboardCheck size={24} /> Doi soat giao dich
      </h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">GD cho duyet</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">Tong tien cho</p>
              <p className="text-2xl font-bold text-emerald-600">{formatVND(stats.pendingAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">TG cho TB</p>
              <p className="text-2xl font-bold">{stats.avgConfirmTimeHours}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-slate-500">Phieu nop tien cho</p>
              <p className="text-2xl font-bold text-blue-600">{stats.pendingDeposits}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button variant={tab === 'pending' ? 'default' : 'outline'} onClick={() => setTab('pending')}>
          <CreditCard size={16} className="mr-1" /> Giao dich ({transactions.length})
        </Button>
        <Button variant={tab === 'cash' ? 'default' : 'outline'} onClick={() => setTab('cash')}>
          <Banknote size={16} className="mr-1" /> Nop tien mat ({cashDeposits.length})
        </Button>
      </div>

      {/* Filter */}
      {tab === 'pending' && (
        <div className="flex gap-2 mb-4">
          <Button variant={!filter ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('')}>Tat ca</Button>
          <Button variant={filter === 'bank_transfer' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('bank_transfer')}>Chuyen khoan</Button>
          <Button variant={filter === 'cash' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('cash')}>Tien mat</Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />)}</div>
      ) : tab === 'pending' ? (
        /* Pending transactions table */
        transactions.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-slate-500">Khong co giao dich cho duyet</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>CTV</TableHead>
                    <TableHead>Khach hang</TableHead>
                    <TableHead className="text-right">So tien</TableHead>
                    <TableHead>PT</TableHead>
                    <TableHead>4 so</TableHead>
                    <TableHead>Thoi gian</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Hanh dong</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono">#{tx.id}</TableCell>
                      <TableCell>{tx.ctv?.name}</TableCell>
                      <TableCell>{tx.customer?.name || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(tx.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.paymentMethod === 'bank_transfer' ? 'default' : 'secondary'}>
                          {tx.paymentMethod === 'bank_transfer' ? 'CK' : 'TM'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{tx.bankCode || '-'}</TableCell>
                      <TableCell className="text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>
                        {tx.paymentProof ? (
                          <Button variant="ghost" size="sm" onClick={() => setViewProof(`http://localhost:4000${tx.paymentProof.imageUrl}`)}>
                            <Eye size={14} />
                          </Button>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleConfirm(tx.id)} disabled={actionLoading === tx.id}>
                            <CheckCircle size={14} className="mr-1" /> Duyet
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setRejectId(tx.id); setRejectReason(''); }}>
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
          <Card><CardContent className="py-12 text-center text-slate-500">Khong co phieu nop tien cho duyet</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {cashDeposits.map((dep: any) => (
              <Card key={dep.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Phieu #{dep.id} - CTV: {dep.ctv?.name}</p>
                    <p className="text-sm text-slate-500">
                      {dep.transactionIds?.length || 0} giao dich | Nop luc: {new Date(dep.depositedAt).toLocaleString('vi-VN')}
                    </p>
                    {dep.notes && <p className="text-xs text-slate-400">Ghi chu: {dep.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold text-emerald-600">{formatVND(dep.amount)}</p>
                    <Button size="sm" onClick={() => handleConfirmDeposit(dep.id)} disabled={actionLoading === dep.id}>
                      <CheckCircle size={14} className="mr-1" /> Xac nhan
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
          <div className="bg-white rounded-xl p-6 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Tu choi giao dich #{rejectId}</h3>
            <Input
              placeholder="Ly do tu choi..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)} className="flex-1">Huy</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason} className="flex-1">Tu choi</Button>
            </div>
          </div>
        </div>
      )}

      {/* Proof viewer modal */}
      {viewProof && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewProof(null)}>
          <div className="bg-white rounded-xl p-4 max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <img src={viewProof} alt="Payment proof" className="w-full rounded" />
            <Button variant="outline" onClick={() => setViewProof(null)} className="mt-3 w-full">Dong</Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
