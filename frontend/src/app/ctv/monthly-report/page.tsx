'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileBarChart } from 'lucide-react';

interface Report {
  month: string;
  personalRevenue: number;
  teamRevenue: number;
  selfCommission: number;
  fixedSalary: number;
  teamBonus: number;
  feeReceived: number;
  feePaid: number;
  netIncome: number;
  tax: number;
  netAfterTax: number;
  taxableIncome: number;
  invoiceLinks: { id: number; invoiceNumber: string; amount: number; type: string; pdfUrl: string | null }[];
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CtvMonthlyReportPage() {
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.ctvMonthlyReport(month)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <DashboardLayout role="ctv">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileBarChart size={24} /> Báo cáo tháng (V12.2)
      </h2>

      <div className="mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Doanh số cá nhân</p>
                <p className="text-xl font-bold">{formatVND(report.personalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Doanh số nhánh</p>
                <p className="text-xl font-bold text-blue-600">{formatVND(report.teamRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Phí DV nhận</p>
                <p className="text-xl font-bold text-emerald-700">{formatVND(report.feeReceived)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Phí DV trả</p>
                <p className="text-xl font-bold text-red-600">{formatVND(report.feePaid)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tổng kết thu nhập tháng {report.month}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Hoa hồng bán hàng</span>
                <span className="font-mono">{formatVND(report.selfCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span>Lương cứng (cap 5%)</span>
                <span className="font-mono">{formatVND(report.fixedSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span>Thưởng team bonus</span>
                <span className="font-mono">{formatVND(report.teamBonus)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>+ Phí DV đào tạo nhận</span>
                <span className="font-mono">{formatVND(report.feeReceived)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>- Phí DV đào tạo trả</span>
                <span className="font-mono">{formatVND(report.feePaid)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Thu nhập gộp</span>
                <span className="font-mono">{formatVND(report.netIncome)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>- Thuế TNCN 10%</span>
                <span className="font-mono">{formatVND(report.tax)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold text-emerald-700">
                <span>Thực nhận</span>
                <span className="font-mono">{formatVND(report.netAfterTax)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hóa đơn liên quan ({report.invoiceLinks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {report.invoiceLinks.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có hóa đơn trong tháng</p>
              ) : (
                <div className="space-y-2">
                  {report.invoiceLinks.map((inv) => (
                    <div key={`${inv.type}-${inv.id}`} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className={inv.type === 'received' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {inv.type === 'received' ? 'Nhận' : 'Trả'}
                        </Badge>
                        <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                      </div>
                      <span className="font-mono font-semibold">{formatVND(inv.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-slate-500">Không có dữ liệu</p>
      )}
    </DashboardLayout>
  );
}
