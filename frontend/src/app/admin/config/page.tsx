'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Users, Building2, Package, GraduationCap } from 'lucide-react';

interface CommissionConfig {
  id: number;
  tier: string;
  selfSalePct: number;
  fixedSalary: number;
}

interface AgencyConfig {
  id: number;
  group: string;
  commissionPct: number;
  bonusPct: number;
}

interface FeeConfigItem {
  id: number;
  tier: string;
  minCombo: number;
  maxCombo: number | null;
  feeAmount: number;
  description: string;
  isActive: boolean;
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
  const [feeConfig, setFeeConfig] = useState<FeeConfigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.adminCommissionConfig(),
      api.adminFeeConfig(),
    ]).then(([commData, feeData]) => {
      setCtvConfig(commData.ctvConfig || []);
      setAgencyConfig(commData.agencyConfig || []);
      setFeeConfig(feeData || []);
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
          {/* CTV Commission Config (V12.1: No F1/F2/F3) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} /> Hoa hồng CTV theo cấp bậc
              </CardTitle>
              <p className="text-sm text-slate-500">Hoa hồng cá nhân + Thù lao DV duy trì (theo V13.2.1)</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cấp bậc</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead className="text-right">HH Tự bán</TableHead>
                    <TableHead className="text-right">Thù lao DV duy trì</TableHead>
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
                      <TableCell className="text-right font-semibold">{c.fixedSalary > 0 ? formatVND(c.fixedSalary) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Fee Config (V12.1: Phí DV đào tạo) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap size={20} /> Phí DV đào tạo theo mốc doanh số nhánh
              </CardTitle>
              <p className="text-sm text-slate-500">Phí cố định theo mốc combo nhánh/tháng · Hệ số K điều chỉnh theo quỹ 3% doanh thu kênh CTV</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mốc</TableHead>
                    <TableHead className="text-right">Combo tối thiểu</TableHead>
                    <TableHead className="text-right">Combo tối đa</TableHead>
                    <TableHead className="text-right">Phí cố định</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeConfig.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell><Badge variant="outline">{f.tier}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{f.minCombo}</TableCell>
                      <TableCell className="text-right font-mono">{f.maxCombo !== null ? f.maxCombo : '∞'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(f.feeAmount)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{f.description}</TableCell>
                      <TableCell>
                        <Badge className={f.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {f.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>Hệ số K:</strong> K = (3% × Tổng DT kênh CTV) ÷ (Tổng phí DV lý thuyết) · Tối thiểu K = 0.7
                <br />
                <strong>Phí thực nhận:</strong> Phí cố định × K
              </div>
            </CardContent>
          </Card>

          {/* Mentor Bonus Pool 6.5% — V13.1 Mục 7.9 */}
          <Card className="mb-6 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap size={20} className="text-purple-600" />
                Phí DV đào tạo cố vấn (Mentor Bonus Pool)
              </CardTitle>
              <p className="text-sm text-slate-500">V13.1 Mục 7.9 · 6.5% doanh số nhánh vượt cấp</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tham số</TableHead>
                    <TableHead>Giá trị mặc định</TableHead>
                    <TableHead>Mô tả</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">% Pool tổng</TableCell>
                    <TableCell><Badge className="bg-purple-100 text-purple-700">6.5%</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">% doanh số nhánh vượt cấp trích vào quỹ</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Phân bổ T1 — Cố vấn trực tiếp</TableCell>
                    <TableCell><Badge className="bg-orange-100 text-orange-700">3%</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">Cấp trên trực tiếp của người vượt cấp</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Phân bổ T2 — Cố vấn gián tiếp</TableCell>
                    <TableCell><Badge className="bg-amber-100 text-amber-700">2%</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">Cấp trên gián tiếp (grand-parent)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Pool chung</TableCell>
                    <TableCell><Badge className="bg-indigo-100 text-indigo-700">1.5%</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">Chia đều cho các GĐKD/GĐV không trực tiếp liên quan</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Acting Manager Bonus, Fast-Track, Soft Salary, Referral */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Các chính sách nhân sự bổ sung</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chính sách</TableHead>
                    <TableHead>Giá trị</TableHead>
                    <TableHead>Mô tả</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Acting Manager Bonus</TableCell>
                    <TableCell><Badge variant="outline">50% thù lao · tối đa 6 tháng</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">Khi mentor ngừng hoạt động, cấp phó được ủy quyền tạm thời nhận 50% thù lao DV duy trì</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Fast-Track thăng cấp</TableCell>
                    <TableCell><Badge variant="outline">≥ 200% KPI + đề cử</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">Vượt 200% KPI 2 tháng liên tiếp + có đề cử từ GĐKD → thăng cấp nhanh (bỏ qua T+1)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Soft Salary (quỹ lương mềm)</TableCell>
                    <TableCell><Badge variant="outline">Ngưỡng 5% DT kênh CTV</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">Quỹ lương cứng không được vượt 5% doanh thu kênh CTV · cảnh báo 80% · dừng 100%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Referral (giới thiệu thành viên)</TableCell>
                    <TableCell><Badge variant="outline">Cap 500K/tháng · Sunset 12 tháng</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">Thưởng giới thiệu tối đa 500K/người giới thiệu/tháng · hết hiệu lực sau 12 tháng kể từ ngày giới thiệu thành công</TableCell>
                  </TableRow>
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
              <p className="text-sm text-slate-500">COGS blended GĐ1 = 50% (NS 65% x 50% + TPCN 35% x 50%)</p>
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
                <p>Số cấp quản lý tối đa = (5% × DT kênh CTV) ÷ Thù lao DV duy trì TB theo cấp</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
