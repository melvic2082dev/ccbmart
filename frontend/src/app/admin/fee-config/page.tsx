'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Users } from 'lucide-react';

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
              <CardTitle>Bảng mốc phí DV đào tạo cố định</CardTitle>
              <p className="text-sm text-slate-500">
                Phí DV đào tạo cố định theo mốc doanh thu nhánh (do CCB Mart chi trả)
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

          {/* Mentor Bonus Pool 6.5% — V13.1 Mục 7.9 */}
          <Card className="mb-6 border-purple-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Phí DV đào tạo cố vấn (Mentor Bonus Pool 6.5%)
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    6.5% doanh số nhánh vượt cấp · phân bổ: Cố vấn trực tiếp 3% (T1), Cố vấn gián tiếp 2% (T2), Pool chung 1.5%
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div className="rounded-md border border-purple-100 bg-purple-50/40 p-3">
                  <p className="text-xs uppercase text-purple-700 tracking-wide">Tổng quỹ Pool tháng này</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{formatVND(MOCK_POOL.totalPool)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Từ doanh số nhánh vượt cấp × 6.5%</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-gray-500 tracking-wide">T1 · Cố vấn trực tiếp (3%)</p>
                  <p className="text-lg font-bold text-orange-700 mt-1">{formatVND(MOCK_POOL.t1Amount)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-gray-500 tracking-wide">T2 · Cố vấn gián tiếp (2%)</p>
                  <p className="text-lg font-bold text-amber-700 mt-1">{formatVND(MOCK_POOL.t2Amount)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-gray-500 tracking-wide">Pool chung (1.5%)</p>
                  <p className="text-lg font-bold text-indigo-700 mt-1">{formatVND(MOCK_POOL.poolShare)}</p>
                </div>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3 text-sm text-blue-900 mb-3">
                <b>Hệ số K đã áp dụng tháng này: {MOCK_POOL.kFactor}</b>
                <span className="text-xs text-gray-600 ml-2">
                  (K = 3% DT kênh CTV ÷ tổng phí lý thuyết — tối thiểu 0.7 để bảo vệ mentor)
                </span>
              </div>

              <p className="text-xs uppercase text-gray-500 tracking-wide mb-2">Mentor nhận trong tháng (mock data)</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentor</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Cấp</TableHead>
                    <TableHead className="text-right">DT nhánh</TableHead>
                    <TableHead className="text-right">Phí Pool (×K)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_POOL.mentors.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.rank}</Badge></TableCell>
                      <TableCell>
                        <Badge className={
                          m.tier === 'T1' ? 'bg-orange-100 text-orange-700 text-xs' :
                          m.tier === 'T2' ? 'bg-amber-100 text-amber-700 text-xs' :
                          'bg-indigo-100 text-indigo-700 text-xs'
                        }>
                          {m.tier === 'T1' ? 'T1 · trực tiếp' : m.tier === 'T2' ? 'T2 · gián tiếp' : 'Pool chung'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatVND(m.branchRevenue)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(Math.round(m.amount * MOCK_POOL.kFactor))}</TableCell>
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
                <p>K = (3% × Tổng DT kênh CTV) ÷ (Tổng phí DV lý thuyết)</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-amber-100 text-amber-800 mt-0.5">Tối thiểu</Badge>
                <p>Hệ số K tối thiểu = <strong>0.7</strong> (bảo vệ mentor)</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-blue-100 text-blue-800 mt-0.5">Thực nhận</Badge>
                <p>Phí thực nhận = Phí cố định (theo mốc) × K</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}

// TODO: replace with real /admin/mentor-pool endpoint (backend)
const MOCK_POOL = {
  totalPool: 118_600_000,
  t1Amount: 54_740_000,  // 3% / 6.5%
  t2Amount: 36_493_000,  // 2% / 6.5%
  poolShare: 27_367_000, // 1.5% / 6.5%
  kFactor: 0.92,
  mentors: [
    { name: 'Nguyễn Văn Hùng', rank: 'GDKD', tier: 'T1', branchRevenue: 820_000_000, amount: 24_600_000 },
    { name: 'Trần Thị Mai',    rank: 'GDV',  tier: 'T1', branchRevenue: 480_000_000, amount: 14_400_000 },
    { name: 'Lê Đức Phong',    rank: 'GDV',  tier: 'T1', branchRevenue: 520_000_000, amount: 15_600_000 },
    { name: 'Phạm Hoàng Nam',  rank: 'TP',   tier: 'T2', branchRevenue: 280_000_000, amount:  5_600_000 },
    { name: 'Hoàng Ngọc Lan',  rank: 'TP',   tier: 'T2', branchRevenue: 310_000_000, amount:  6_200_000 },
    { name: 'Vũ Thanh Sơn',    rank: 'TP',   tier: 'T2', branchRevenue: 245_000_000, amount:  4_900_000 },
    { name: 'Phan Thanh Nam',  rank: 'PP',   tier: 'POOL', branchRevenue: 180_000_000, amount: 2_700_000 },
    { name: 'Đặng Minh Tuấn',  rank: 'PP',   tier: 'POOL', branchRevenue: 155_000_000, amount: 2_325_000 },
  ],
};
