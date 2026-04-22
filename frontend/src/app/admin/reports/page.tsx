'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { FileText, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Report {
  month: string;
  revenue: { ctv: number; agency: number; showroom: number; total: number };
  cogs: number;
  grossProfit: number;
  grossMargin: string;
  ctvCost: number;
  agencyCost: number;
  fixedSalaries: number;
  salaryFundPct: number;
  opex: number;
  netProfit: number;
  netMargin: string;
  transactionCount: number;
}

const vndFormatter = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}tr`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
};

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminReports(6).then((data) => {
      setReports(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const chartData = reports.map(r => ({
    month: r.month,
    'Doanh thu': r.revenue.total,
    'LN gộp': r.grossProfit,
    'LN ròng': r.netProfit,
    'CTV': r.revenue.ctv,
    'Đại lý': r.revenue.agency,
    'Showroom': r.revenue.showroom,
    'Quỹ lương %': r.salaryFundPct,
  }));

  const totalRevenue = reports.reduce((s, r) => s + r.revenue.total, 0);
  const totalNetProfit = reports.reduce((s, r) => s + r.netProfit, 0);
  const totalTransactions = reports.reduce((s, r) => s + r.transactionCount, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={24} /> Báo cáo Tài chính
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => api.adminExportExcel(6)}
            className="flex items-center gap-1"
          >
            <Download size={16} /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => api.adminExportPdf(6)}
            className="flex items-center gap-1"
          >
            <Download size={16} /> PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Tổng doanh thu ({reports.length} tháng)</p>
                <p className="text-2xl font-bold text-emerald-600">{formatVND(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Tổng LN ròng</p>
                <p className={`text-2xl font-bold ${totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatVND(totalNetProfit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Tổng giao dịch</p>
                <p className="text-2xl font-bold">{totalTransactions.toLocaleString('vi-VN')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by channel chart */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Doanh thu theo kênh</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={vndFormatter} />
                  <Tooltip formatter={(value: any) => formatVND(Number(value))} />
                  <Legend />
                  <Bar dataKey="CTV" stackId="a" fill="#10b981" />
                  <Bar dataKey="Đại lý" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Showroom" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit trend */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Xu hướng lợi nhuận</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={vndFormatter} />
                  <Tooltip formatter={(value: any) => formatVND(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="LN gộp" stroke="#10b981" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="LN ròng" stroke="#6366f1" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Salary Fund Trend */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quỹ lương cứng CTV (% ngưỡng 5% DT)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 150]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                  <Bar dataKey="Quỹ lương %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" /> &lt;80%: OK</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded" /> 80-100%: Cảnh báo</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> &gt;100%: Vượt ngưỡng</span>
              </div>
            </CardContent>
          </Card>

          {/* Detailed P&L Table */}
          <Card>
            <CardHeader><CardTitle>P&L chi tiết theo tháng</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tháng</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">LN gộp</TableHead>
                    <TableHead className="text-right">Biên gộp</TableHead>
                    <TableHead className="text-right">CP CTV</TableHead>
                    <TableHead className="text-right">CP Đại lý</TableHead>
                    <TableHead className="text-right">Lương cứng</TableHead>
                    <TableHead className="text-right">OPEX</TableHead>
                    <TableHead className="text-right">LN ròng</TableHead>
                    <TableHead className="text-right">Biên ròng</TableHead>
                    <TableHead className="text-right">Quỹ lương</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell className="text-right">{formatVND(r.revenue.total)}</TableCell>
                      <TableCell className="text-right text-slate-500">{formatVND(r.cogs)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatVND(r.grossProfit)}</TableCell>
                      <TableCell className="text-right">{r.grossMargin}%</TableCell>
                      <TableCell className="text-right text-slate-500">{formatVND(r.ctvCost)}</TableCell>
                      <TableCell className="text-right text-slate-500">{formatVND(r.agencyCost)}</TableCell>
                      <TableCell className="text-right text-slate-500">{formatVND(r.fixedSalaries)}</TableCell>
                      <TableCell className="text-right text-slate-500">{formatVND(r.opex)}</TableCell>
                      <TableCell className={`text-right font-semibold ${r.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatVND(r.netProfit)}
                      </TableCell>
                      <TableCell className={`text-right ${parseFloat(r.netMargin) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.netMargin}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.salaryFundPct >= 100 ? 'destructive' : r.salaryFundPct >= 80 ? 'secondary' : 'outline'}>
                          {r.salaryFundPct.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
