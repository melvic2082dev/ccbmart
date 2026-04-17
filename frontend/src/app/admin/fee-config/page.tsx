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
        <GraduationCap size={24} /> Phí DV Đào tạo
      </h2>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bảng mốc phí DV đào tạo cố định (M0–M5)</CardTitle>
              <p className="text-sm text-slate-500">
                V13.3 · Phí DV đào tạo cố định theo mốc combo nhánh (CCB Mart chi trả).
                Phí quản lý trong nhóm (F1 10% / F2 5% / F3 3%) được tính riêng từ quỹ hiện có.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mốc</TableHead>
                    <TableHead className="text-right">Combo tối thiểu</TableHead>
                    <TableHead className="text-right">Combo tối đa</TableHead>
                    <TableHead className="text-right">Phí cố định</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant={c.feeAmount > 0 ? 'default' : 'secondary'} title={c.description}>
                          {c.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{c.minCombo}</TableCell>
                      <TableCell className="text-right font-mono">{c.maxCombo !== null ? c.maxCombo : '∞'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {c.feeAmount > 0 ? formatVND(c.feeAmount) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {c.isActive ? 'Đang áp dụng' : 'Ngừng'}
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
              <CardTitle>Phí quản lý trong nhóm · Cấp 1/Cấp 2/Cấp 3</CardTitle>
              <p className="text-sm text-slate-500">
                Phí quản lý & phí sau thoát ly được CCB Mart chi trả từ quỹ hiện có.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge className="bg-orange-100 text-orange-800 mt-0.5">F1 · 10%</Badge>
                <p>Cấp trên trực tiếp TP+ nhận 10% combo bán lẻ của F1. Điều kiện: ≥ 20h đào tạo/tháng.</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-amber-100 text-amber-800 mt-0.5">F2 · 5%</Badge>
                <p>Grand-parent GĐV+ nhận 5% combo bán lẻ của F2. Điều kiện: ≥ 20h đào tạo/tháng.</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-indigo-100 text-indigo-800 mt-0.5">F3 · 3%</Badge>
                <p>Great-grand-parent GĐKD nhận 3% combo bán lẻ của F3. Điều kiện: ≥ 20h đào tạo/tháng.</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-800 mt-0.5">Sau thoát ly</Badge>
                <p>12 tháng đầu: 3% (F1 cũ) + 2% (F2 cũ) + 1% (GĐKD — chỉ khi không trùng F1/F2 cũ).</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
