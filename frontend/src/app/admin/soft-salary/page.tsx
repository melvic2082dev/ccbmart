'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, AlertTriangle } from 'lucide-react';

export default function AdminSoftSalary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await api.adminSoftSalary();
        setData(result);
      } catch {}
      setLoading(false);
    }
    fetchData();
  }, []);

  const BRACKET_LABELS: Record<string, { label: string; color: string }> = {
    NORMAL: { label: 'Binh thuong', color: 'bg-green-100 text-green-700' },
    WARNING: { label: 'Canh bao (100-120%)', color: 'bg-yellow-100 text-yellow-700' },
    HIGH: { label: 'Cao (120-150%)', color: 'bg-orange-100 text-orange-700' },
    FREEZE: { label: 'Tam dung bo nhiem (>150%)', color: 'bg-red-100 text-red-700' },
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Calculator size={24} /> Luong linh hoat (Soft Salary)</h2>
        {data && <Badge className={BRACKET_LABELS[data.bracket]?.color || ''}>{BRACKET_LABELS[data.bracket]?.label || data.bracket}</Badge>}
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-xl" />)}</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Fund progress bar */}
          <Card className="rounded-2xl border border-gray-100">
            <CardHeader>
              <CardTitle>Quy luong thang {data.month}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">DT kenh CTV</p>
                  <p className="text-base font-bold">{formatVND(data.ctvRevenue)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Quy luong (5%)</p>
                  <p className="text-base font-bold">{formatVND(data.salaryFundCap)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Tong luong cung</p>
                  <p className="text-base font-bold">{formatVND(data.totalFixedSalary)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Luong thuc tra</p>
                  <p className="text-base font-bold">{formatVND(data.totalActualSalary)}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className={`h-4 rounded-full transition-all ${data.usagePercent > 150 ? 'bg-red-500' : data.usagePercent > 120 ? 'bg-orange-500' : data.usagePercent > 100 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(data.usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Su dung: <span className="font-semibold">{data.usagePercent}%</span> quy luong</p>
              {data.freezeHiring && (
                <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertTriangle size={18} />
                  <span className="text-sm font-medium">Tam dung bo nhiem quan ly moi - quy luong vuot 150%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Salary table */}
          <Card className="rounded-2xl border border-gray-100">
            <CardHeader>
              <CardTitle>Chi tiet luong tung nguoi</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ten</TableHead>
                    <TableHead>Chuc danh</TableHead>
                    <TableHead className="text-right">Luong co ban</TableHead>
                    <TableHead className="text-right">DT ca nhan</TableHead>
                    <TableHead className="text-right">He so</TableHead>
                    <TableHead className="text-right">Luong cung</TableHead>
                    <TableHead className="text-right">Luong bien doi</TableHead>
                    <TableHead className="text-right">Thuc nhan</TableHead>
                    <TableHead>Ghi chu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details?.map((d: any) => (
                    <TableRow key={d.id} className={d.isAdjusted ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell><Badge variant="outline">{d.rank}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{formatVND(d.baseSalary)}</TableCell>
                      <TableCell className="text-right font-mono">{formatVND(d.personalRevenue)}</TableCell>
                      <TableCell className="text-right font-mono">{(d.coefficient * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-mono">{formatVND(d.actualFixed)}</TableCell>
                      <TableCell className="text-right font-mono">{d.variableSalary > 0 ? formatVND(d.variableSalary) : '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(d.totalSalary)}</TableCell>
                      <TableCell>{d.isAdjusted ? <Badge className="bg-yellow-100 text-yellow-700">Dieu chinh</Badge> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
