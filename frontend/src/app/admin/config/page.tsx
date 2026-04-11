'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Users, Building2, Package } from 'lucide-react';

interface CommissionConfig {
  id: number;
  tier: string;
  selfSalePct: number;
  f1Pct: number;
  f2Pct: number;
  f3Pct: number;
  fixedSalary: number;
}

interface AgencyConfig {
  id: number;
  group: string;
  commissionPct: number;
  bonusPct: number;
}

const RANK_LABELS: Record<string, string> = {
  CTV: 'Cộng tác viên',
  PP: 'Phó phòng KD',
  TP: 'Trưởng phòng KD',
  GDV: 'Giám đốc Vùng',
  GDKD: 'Giám đốc Kinh doanh',
};

const GROUP_LABELS: Record<string, string> = {
  A: 'Nhóm A — Thiết yếu (Nông sản, suất ăn)',
  B: 'Nhóm B — Core (FMCG, gia vị)',
  C: 'Nhóm C — Lợi nhuận cao (TPCN, combo)',
};

const COGS_TABLE = [
  { phase: 'GĐ1 (0-6 tháng)', cogs: '50%', note: 'Blended NS 65% + TPCN 35%' },
  { phase: 'GĐ2 (6-18 tháng)', cogs: '63%', note: 'Mở rộng FMCG, gia vị' },
  { phase: 'GĐ3 (18-36 tháng)', cogs: '58%', note: 'Danh mục tối ưu' },
  { phase: 'GĐ4 (3-5 năm)', cogs: '55%', note: 'Mature stores' },
];

export default function AdminConfig() {
  const [ctvConfig, setCtvConfig] = useState<CommissionConfig[]>([]);
  const [agencyConfig, setAgencyConfig] = useState<AgencyConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminCommissionConfig().then((data) => {
      setCtvConfig(data.ctvConfig || []);
      setAgencyConfig(data.agencyConfig || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings size={24} /> Cấu hình hệ thống
      </h2>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* CTV Commission Config */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} /> Hoa hồng CTV theo cấp bậc
              </CardTitle>
              <p className="text-sm text-slate-500">Cascading: Tự bán + F1 (10%) + F2 (5%) + F3 (3%)</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cấp bậc</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead className="text-right">HH Tự bán</TableHead>
                    <TableHead className="text-right">Phụ cấp F1</TableHead>
                    <TableHead className="text-right">Phụ cấp F2</TableHead>
                    <TableHead className="text-right">Phụ cấp F3</TableHead>
                    <TableHead className="text-right">Lương cứng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ctvConfig.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant={c.tier === 'GDKD' ? 'default' : 'secondary'}>{c.tier}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{RANK_LABELS[c.tier] || c.tier}</TableCell>
                      <TableCell className="text-right font-mono">{(c.selfSalePct * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-mono">{c.f1Pct > 0 ? `${(c.f1Pct * 100).toFixed(0)}%` : '-'}</TableCell>
                      <TableCell className="text-right font-mono">{c.f2Pct > 0 ? `${(c.f2Pct * 100).toFixed(0)}%` : '-'}</TableCell>
                      <TableCell className="text-right font-mono">{c.f3Pct > 0 ? `${(c.f3Pct * 100).toFixed(0)}%` : '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{c.fixedSalary > 0 ? formatVND(c.fixedSalary) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* KPI Thresholds */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Điều kiện duy trì chức danh (KPI)</CardTitle>
              <p className="text-sm text-slate-500">Combo giá 2.000.000 VND | Đánh giá mỗi tháng</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cấp</TableHead>
                    <TableHead>Tự bán (combo/tháng)</TableHead>
                    <TableHead>Portfolio tối thiểu</TableHead>
                    <TableHead>Nếu không đạt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Badge variant="outline">CTV</Badge></TableCell>
                    <TableCell>Không bắt buộc</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-slate-500">Khóa sau 3 tháng không giao dịch</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-amber-100 text-amber-800">PP</Badge></TableCell>
                    <TableCell>≥ 50 combo</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-red-600">Giảm xuống CTV</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-800">TP</Badge></TableCell>
                    <TableCell>≥ 50 combo</TableCell>
                    <TableCell>≥ 150 combo</TableCell>
                    <TableCell className="text-red-600">Giảm xuống PP</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-blue-100 text-blue-800">GDV</Badge></TableCell>
                    <TableCell>≥ 50 combo</TableCell>
                    <TableCell>≥ 550 combo</TableCell>
                    <TableCell className="text-red-600">Giảm xuống TP</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-purple-100 text-purple-800">GDKD</Badge></TableCell>
                    <TableCell>≥ 50 combo</TableCell>
                    <TableCell>≥ 1.000 combo</TableCell>
                    <TableCell className="text-red-600">Giảm xuống GDV</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Agency Commission Config */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={20} /> Hoa hồng Đại lý theo nhóm sản phẩm
              </CardTitle>
              <p className="text-sm text-slate-500">Tối đa 20% | Điểm thưởng tối đa 5% doanh số</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhóm</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Hoa hồng</TableHead>
                    <TableHead className="text-right">Thưởng</TableHead>
                    <TableHead className="text-right">Tổng tối đa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyConfig.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell><Badge>{a.group}</Badge></TableCell>
                      <TableCell className="text-sm">{GROUP_LABELS[a.group] || a.group}</TableCell>
                      <TableCell className="text-right font-mono">{(a.commissionPct * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-mono">{(a.bonusPct * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-semibold">{((a.commissionPct + a.bonusPct) * 100).toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* COGS Config */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} /> COGS theo giai đoạn
              </CardTitle>
              <p className="text-sm text-slate-500">COGS blended GĐ1 = 50% (NS 65% × 50% + TPCN 35% × 50%)</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Giai đoạn</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COGS_TABLE.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.phase}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{row.cogs}</TableCell>
                      <TableCell className="text-sm text-slate-500">{row.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Salary Fund Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Quy tắc quỹ lương cứng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Ngưỡng</Badge>
                <p>Tổng quỹ lương cứng ≤ <strong>5% doanh thu kênh CTV</strong></p>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-yellow-100 text-yellow-800 mt-0.5">80%</Badge>
                <p>Cảnh báo khi quỹ lương đạt 80% ngưỡng</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="destructive" className="mt-0.5">100%</Badge>
                <p>Tạm dừng bổ nhiệm cấp quản lý mới khi vượt 100%</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Công thức</Badge>
                <p>Số cấp quản lý tối đa = (5% × DT kênh CTV) / Lương cứng TB theo cấp</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
