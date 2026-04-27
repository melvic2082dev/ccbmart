'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Info } from 'lucide-react';

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
    <>
      <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
        <GraduationCap size={24} /> Bậc K-factor (M0–M5)
      </h2>

      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-900 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Bảng mốc dùng để <span className="font-medium">tính hệ số K (cap quỹ đào tạo)</span> — không trả trực tiếp cho ai.
          Các khoản trả thực tế là <span className="font-medium">Lương cố định, Phí quản lý, Phí thoát ly</span> theo cấp/rank, xem tại các trang riêng.
        </span>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Bảng mốc theo số combo nhánh/tháng</CardTitle>
            <p className="text-sm text-slate-500">
              Mỗi mốc tương ứng 1 mức "phí lý thuyết" của nhánh. Tổng phí lý thuyết của tất cả CTV chia cho quỹ đào tạo (3% doanh thu) ra hệ số K, sàn 0.7.
            </p>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mốc</TableHead>
                    <TableHead className="text-right">Combo tối thiểu</TableHead>
                    <TableHead className="text-right">Combo tối đa</TableHead>
                    <TableHead className="text-right">Phí lý thuyết</TableHead>
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
            </div>

            {/* Mobile compact card */}
            <div className="md:hidden space-y-2">
              {configs.map((c) => (
                <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={c.feeAmount > 0 ? 'default' : 'secondary'} title={c.description}>
                      {c.tier}
                    </Badge>
                    <Badge className={c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {c.isActive ? 'Đang áp dụng' : 'Ngừng'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Combo:</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {c.minCombo} – {c.maxCombo !== null ? c.maxCombo : '∞'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-gray-500">Phí lý thuyết:</span>
                    <span className="font-semibold text-emerald-700">
                      {c.feeAmount > 0 ? formatVND(c.feeAmount) : '—'}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-gray-500 italic pt-1">{c.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
