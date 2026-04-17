'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export default function MemberTransactions() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.memberTransactions(page).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  const statusBadge = (s: string) => {
    if (s === 'CONFIRMED') return <Badge className="bg-green-100 text-green-700" variant="outline">Thành công</Badge>;
    if (s === 'PENDING') return <Badge className="bg-yellow-100 text-yellow-700" variant="outline">Chờ duyệt</Badge>;
    return <Badge className="bg-red-100 text-red-700" variant="outline">Từ chối</Badge>;
  };

  return (
    <DashboardLayout role="member">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ShoppingCart size={24} /> Lịch sử giao dịch</h2>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle>Lịch sử nạp tiền</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Phương thức</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.deposits || []).map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>#{d.id}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(d.amount)}</TableCell>
                      <TableCell>{d.method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</TableCell>
                      <TableCell>{statusBadge(d.status)}</TableCell>
                      <TableCell className="text-xs">{new Date(d.createdAt).toLocaleString('vi-VN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {data?.commissions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Hoa hồng referral</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Từ</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Tỷ lệ</TableHead>
                      <TableHead>Tháng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.commissions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.sourceWallet?.user?.name || '-'}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">+{formatVND(c.amount)}</TableCell>
                        <TableCell>{(c.ratePct * 100).toFixed(0)}%</TableCell>
                        <TableCell>{c.month}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {(data?.totalPages || 1) > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <span className="flex items-center text-sm text-gray-500">Trang {page}/{data?.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= (data?.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
