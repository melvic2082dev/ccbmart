'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap } from 'lucide-react';

interface FeeConfigItem {
  id: number;
  tier: string;
  minCombo: number;
  maxCombo: number | null;
  feeAmount: number;
  description: string;
  isActive: boolean;
  updatedAt: string;
}

export default function FeeConfigPage() {
  const [configs, setConfigs] = useState<FeeConfigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminFeeConfig()
      .then(setConfigs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <GraduationCap size={24} /> Phí DV Đào tạo (V12.1)
      </h2>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bảng mốc phí dịch vụ đào tạo</CardTitle>
              <p className="text-sm text-slate-500">
                Phí cố định theo số combo nhánh (thay thế hoa hồng F1/F2/F3)
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Min combo</TableHead>
                    <TableHead className="text-right">Max combo</TableHead>
                    <TableHead className="text-right">Phí cố định</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant={c.feeAmount > 0 ? 'default' : 'secondary'}>{c.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{c.minCombo}</TableCell>
                      <TableCell className="text-right font-mono">{c.maxCombo !== null ? c.maxCombo : '∞'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {c.feeAmount > 0 ? formatVND(c.feeAmount) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{c.description}</TableCell>
                      <TableCell>
                        <Badge className={c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hệ số K (K Factor)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Công thức</Badge>
                <p>K = (3% x Tổng DT kênh CTV) / (Tổng phí DV lý thuyết)</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-amber-100 text-amber-800 mt-0.5">Min</Badge>
                <p>Hệ số K tối thiểu = <strong>0.7</strong> (bảo vệ mentor)</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-blue-100 text-blue-800 mt-0.5">Thực nhận</Badge>
                <p>Phí thực nhận = Phí cố định (theo mốc) x K</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
