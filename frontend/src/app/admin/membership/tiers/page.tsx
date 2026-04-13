'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award } from 'lucide-react';

export default function AdminTiers() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.adminMembershipTiers().then(setTiers).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Award size={24} /> Hang the thanh vien</h2>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hang</TableHead>
                  <TableHead className="text-right">Nap toi thieu</TableHead>
                  <TableHead className="text-right">Giam gia</TableHead>
                  <TableHead className="text-right">Referral %</TableHead>
                  <TableHead className="text-right">Cap/thang</TableHead>
                  <TableHead className="text-right">So thanh vien</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell><Badge className={`bg-${t.color}-100 text-${t.color}-700`} variant="outline">{t.name}</Badge></TableCell>
                    <TableCell className="text-right">{formatVND(t.minDeposit)}</TableCell>
                    <TableCell className="text-right">{(t.discountPct * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{(t.referralPct * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{formatVND(t.monthlyReferralCap)}</TableCell>
                    <TableCell className="text-right font-semibold">{t._count?.wallets || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
