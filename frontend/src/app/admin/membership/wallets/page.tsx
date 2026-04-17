'use client';
import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet } from 'lucide-react';

export default function AdminMemberWallets() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.adminMemberWallets(page)
      .then(setData)
      .catch((e) => setError(e?.message || 'Không tải được danh sách ví thành viên'))
      .finally(() => setLoading(false));
  }, [page]);

  const tierColor: Record<string, string> = { gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700', amber: 'bg-amber-100 text-amber-700' };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Wallet size={24} /> Quản lý ví thành viên ({data?.total || 0})</h2>
      {error && (
        <div className="mb-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
          <p className="font-semibold mb-1">Không tải được dữ liệu</p>
          <p>{error}</p>
          <p className="mt-1 text-xs text-red-600">Kiểm tra backend đã chạy và database đã seed (tại thời điểm seed có {data?.total ?? '…'} ví).</p>
        </div>
      )}
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : !error && (data?.wallets?.length ?? 0) === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded-xl">
          Chưa có ví thành viên nào. Chạy <code>npm run seed</code> để tạo dữ liệu mẫu.
        </div>
      ) : !error ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Hạng</TableHead>
                <TableHead className="text-right">Số dư</TableHead>
                <TableHead className="text-right">Tổng nạp</TableHead>
                <TableHead className="text-right">Giới thiệu</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data?.wallets || []).map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.user?.name}</TableCell>
                    <TableCell className="text-xs">{w.user?.email}</TableCell>
                    <TableCell className="text-xs">{w.user?.phone}</TableCell>
                    <TableCell><Badge className={tierColor[w.tier?.color] || 'bg-gray-100'} variant="outline">{w.tier?.name}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(w.balance ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatVND(w.totalDeposit ?? 0)}</TableCell>
                    <TableCell className="text-right">{w._count?.referrals || 0}</TableCell>
                    <TableCell><Badge className={w.user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} variant="outline">{w.user?.isActive ? 'Active' : 'Locked'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      {(data?.totalPages || 1) > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="flex items-center text-sm text-gray-500">Trang {page}/{data?.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= (data?.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </>
  );
}
