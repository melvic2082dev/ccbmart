'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';

export default function AdminMemberDeposits() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { const d = await api.adminMemberDeposits(1, filter || undefined); setData(d); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, [filter]);

  const handleConfirm = async (id: number) => {
    setActionLoading(id);
    try { await api.adminConfirmMemberDeposit(id); await fetchData(); } catch {}
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    setActionLoading(rejectId);
    try { await api.adminRejectMemberDeposit(rejectId, rejectReason); setRejectId(null); setRejectReason(''); await fetchData(); } catch {}
    setActionLoading(null);
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><CreditCard size={24} /> Duyet nap tien thanh vien</h2>
      <div className="flex gap-2 mb-4">
        {['PENDING', 'CONFIRMED', 'REJECTED', ''].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
            {s || 'Tat ca'}
          </Button>
        ))}
      </div>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Thanh vien</TableHead>
                  <TableHead>Hang</TableHead>
                  <TableHead className="text-right">So tien</TableHead>
                  <TableHead>PT</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead>Ngay</TableHead>
                  <TableHead>Hanh dong</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.deposits || []).map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>#{d.id}</TableCell>
                    <TableCell>{d.wallet?.user?.name}</TableCell>
                    <TableCell><Badge variant="outline">{d.wallet?.tier?.name}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(d.amount)}</TableCell>
                    <TableCell>{d.method === 'bank_transfer' ? 'CK' : 'TM'}</TableCell>
                    <TableCell>
                      <Badge className={d.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : d.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} variant="outline">{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(d.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>
                      {d.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleConfirm(d.id)} disabled={actionLoading === d.id}><CheckCircle size={14} /></Button>
                          <Button size="sm" variant="destructive" onClick={() => setRejectId(d.id)}><XCircle size={14} /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectId(null)}>
          <div className="bg-white rounded-xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Tu choi nap tien #{rejectId}</h3>
            <Input placeholder="Ly do..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="mb-4" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)} className="flex-1">Huy</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason} className="flex-1">Tu choi</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
