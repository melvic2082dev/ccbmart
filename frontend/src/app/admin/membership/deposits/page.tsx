'use client';
import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
};

export default function AdminMemberDeposits() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('PENDING');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.adminMemberDeposits(1, filter || undefined);
      setData(d);
    } catch (e: any) {
      setError(e?.message || 'Không tải được danh sách nạp tiền');
    }
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
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><CreditCard size={24} /> Duyệt nạp tiền thành viên</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {['PENDING', 'CONFIRMED', 'REJECTED', ''].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
            {s ? (STATUS_LABELS[s] || s) : 'Tất cả'}
          </Button>
        ))}
      </div>
      {error && (
        <div className="mb-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
          <p className="font-semibold mb-1">Không tải được dữ liệu</p>
          <p>{error}</p>
          <p className="mt-1 text-xs text-red-600">Kiểm tra backend đã chạy (port 4000) và đã <code>npm run seed</code>.</p>
        </div>
      )}
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : !error && (data?.deposits?.length ?? 0) === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded-xl">
          Không có giao dịch nạp tiền nào ở trạng thái <strong>{filter ? (STATUS_LABELS[filter] || filter) : 'Tất cả'}</strong>.
        </div>
      ) : !error ? (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Thành viên</TableHead>
                    <TableHead>Hạng</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Phương thức</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.deposits || []).map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>#{d.id}</TableCell>
                      <TableCell>{d.wallet?.user?.name}</TableCell>
                      <TableCell><Badge variant="outline">{d.wallet?.tier?.name}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(d.amount)}</TableCell>
                      <TableCell>{d.method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</TableCell>
                      <TableCell>
                        <Badge className={d.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : d.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} variant="outline">{STATUS_LABELS[d.status] || d.status}</Badge>
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

          {/* Mobile compact card */}
          <div className="md:hidden space-y-2">
            {(data?.deposits || []).map((d: any) => (
              <div key={d.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-400 font-mono shrink-0">#{d.id}</span>
                    <Badge variant="outline" className="shrink-0">{d.wallet?.tier?.name}</Badge>
                  </div>
                  <Badge className={d.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : d.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} variant="outline">
                    {STATUS_LABELS[d.status] || d.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-800 truncate">{d.wallet?.user?.name}</p>
                  <p className="font-bold text-emerald-700 shrink-0 tabular-nums">{formatVND(d.amount)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span>{d.method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
                  <span>{new Date(d.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                {d.status === 'PENDING' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" className="flex-1" onClick={() => handleConfirm(d.id)} disabled={actionLoading === d.id}>
                      <CheckCircle size={14} className="mr-1" /> Duyệt
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectId(d.id)}>
                      <XCircle size={14} className="mr-1" /> Từ chối
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Từ chối nạp tiền #{rejectId}</h3>
            <Input placeholder="Lý do…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="mb-4" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)} className="flex-1">Huỷ</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason} className="flex-1">Từ chối</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
