'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award } from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  GREEN: 'Green — Khởi đầu',
  BASIC: 'Basic',
  STANDARD: 'Standard',
  VIP_GOLD: 'VIP Gold',
};

const TIER_COLORS: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-700',
  BASIC: 'bg-slate-100 text-slate-700',
  STANDARD: 'bg-blue-100 text-blue-700',
  VIP_GOLD: 'bg-amber-100 text-amber-700',
};

export default function AdminTiers() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.adminMembershipTiers().then(setTiers).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Award size={24} /> Hạng thẻ thành viên</h2>
      <p className="text-sm text-slate-500 mb-6">4 hạng: Green / Basic / Standard / VIP Gold · Cap referral 2.000.000đ/tháng</p>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hạng</TableHead>
                  <TableHead className="text-right">Nạp tối thiểu</TableHead>
                  <TableHead className="text-right">Điểm tích (%)</TableHead>
                  <TableHead className="text-right">Giảm giá (%)</TableHead>
                  <TableHead className="text-right">Referral (%)</TableHead>
                  <TableHead className="text-right">Cap/tháng</TableHead>
                  <TableHead className="text-right">Số thành viên</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge className={TIER_COLORS[t.name] || 'bg-gray-100 text-gray-700'} variant="outline">
                        {TIER_LABELS[t.name] || t.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatVND(t.minDeposit)}</TableCell>
                    <TableCell className="text-right">{((t.pointsRate || 0) * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{((t.discountPct || 0) * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{((t.referralPct || 0) * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{formatVND(t.monthlyReferralCap || 0)}</TableCell>
                    <TableCell className="text-right font-semibold">{t._count?.wallets || 0}</TableCell>
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
