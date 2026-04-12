'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet } from 'lucide-react';

export default function AdminMemberWallets() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { api.adminMemberWallets(page).then(setData).catch(() => {}).finally(() => setLoading(false)); }, [page]);

  const tierColor: Record<string, string> = { gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700', amber: 'bg-amber-100 text-amber-700' };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Wallet size={24} /> Quan ly vi thanh vien ({data?.total || 0})</h2>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Ten</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>SDT</TableHead>
                <TableHead>Hang</TableHead>
                <TableHead className="text-right">So du</TableHead>
                <TableHead className="text-right">Tong nap</TableHead>
                <TableHead className="text-right">Referrals</TableHead>
                <TableHead>Trang thai</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data?.wallets || []).map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.user?.name}</TableCell>
                    <TableCell className="text-xs">{w.user?.email}</TableCell>
                    <TableCell className="text-xs">{w.user?.phone}</TableCell>
                    <TableCell><Badge className={tierColor[w.tier?.color] || 'bg-gray-100'} variant="outline">{w.tier?.name}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(w.balance)}</TableCell>
                    <TableCell className="text-right">{formatVND(w.totalDeposit)}</TableCell>
                    <TableCell className="text-right">{w._count?.referrals || 0}</TableCell>
                    <TableCell><Badge className={w.user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} variant="outline">{w.user?.isActive ? 'Active' : 'Locked'}</Badge></TableCell>
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
    </DashboardLayout>
  );
}
