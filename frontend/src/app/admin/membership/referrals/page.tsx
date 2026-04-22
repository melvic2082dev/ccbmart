'use client';
import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';

export default function AdminReferralReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.adminReferralReport().then(setData).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Users size={24} /> Báo cáo Referral</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="floating-card"><CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-500">Tổng hoa hồng</p>
          <p className="text-2xl font-bold text-green-600">{formatVND(data?.totalAmount || 0)}</p>
        </CardContent></Card>
        <Card className="floating-card"><CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-500">Tổng giao dịch</p>
          <p className="text-2xl font-bold">{data?.totalCount || 0}</p>
        </CardContent></Card>
      </div>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Người giới thiệu</TableHead>
                <TableHead>Hạng</TableHead>
                <TableHead>Người được GT</TableHead>
                <TableHead className="text-right">Hoa hồng</TableHead>
                <TableHead>Tỷ lệ</TableHead>
                <TableHead>Tháng</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data?.commissions || []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.earnerWallet?.user?.name}</TableCell>
                    <TableCell>{c.earnerWallet?.tier?.name}</TableCell>
                    <TableCell>{c.sourceWallet?.user?.name}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{formatVND(c.amount)}</TableCell>
                    <TableCell>{(c.ratePct * 100).toFixed(0)}%</TableCell>
                    <TableCell>{c.month}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
