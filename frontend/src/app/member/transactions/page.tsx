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
    if (s === 'CONFIRMED') return <Badge className="bg-green-100 text-green-700" variant="outline">Thanh cong</Badge>;
    if (s === 'PENDING') return <Badge className="bg-yellow-100 text-yellow-700" variant="outline">Cho duyet</Badge>;
    return <Badge className="bg-red-100 text-red-700" variant="outline">Tu choi</Badge>;
  };

  return (
    <DashboardLayout role="member">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ShoppingCart size={24} /> Lich su giao dich</h2>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle>Lich su nap tien</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">So tien</TableHead>
                    <TableHead>Phuong thuc</TableHead>
                    <TableHead>Trang thai</TableHead>
                    <TableHead>Ngay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.deposits || []).map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>#{d.id}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(d.amount)}</TableCell>
                      <TableCell>{d.method === 'bank_transfer' ? 'Chuyen khoan' : 'Tien mat'}</TableCell>
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
              <CardHeader><CardTitle>Hoa hong referral</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tu</TableHead>
                      <TableHead className="text-right">So tien</TableHead>
                      <TableHead>Ty le</TableHead>
                      <TableHead>Thang</TableHead>
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
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Truoc</Button>
              <span className="flex items-center text-sm text-gray-500">Trang {page}/{data?.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= (data?.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
