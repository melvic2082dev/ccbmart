'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Play } from 'lucide-react';

interface TaxRecord {
  id: number;
  month: string;
  taxableIncome: number;
  taxAmount: number;
  status: string;
  user: { id: number; name: string; rank: string | null; isBusinessHousehold: boolean };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminTaxPage() {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [totalTax, setTotalTax] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth());
  const [processing, setProcessing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.adminTax(month || undefined)
      .then((d) => {
        setRecords(d.records || []);
        setTotalTax(d.totalTax || 0);
        setTotalIncome(d.totalIncome || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [month]);

  const runProcess = async () => {
    setProcessing(true);
    try {
      await api.adminTaxProcess(month);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await api.adminTaxMarkPaid(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Calculator size={24} /> Thuế TNCN 10% (V12.2)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Tổng thu nhập chịu thuế</p>
            <p className="text-2xl font-bold">{formatVND(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Tổng thuế 10%</p>
            <p className="text-2xl font-bold text-red-600">{formatVND(totalTax)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Số bản ghi</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        />
        <button
          onClick={runProcess}
          disabled={processing}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Play size={16} /> {processing ? 'Đang tính...' : 'Tính thuế tháng'}
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Bảng thuế ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người nộp</TableHead>
                  <TableHead>Chức danh</TableHead>
                  <TableHead>HKD</TableHead>
                  <TableHead>Tháng</TableHead>
                  <TableHead className="text-right">Thu nhập</TableHead>
                  <TableHead className="text-right">Thuế 10%</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.user.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.user.rank || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.user.isBusinessHousehold ? (
                        <Badge className="bg-blue-100 text-blue-700">HKD</Badge>
                      ) : (
                        <Badge variant="outline">Cá nhân</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.month}</TableCell>
                    <TableCell className="text-right font-mono">{formatVND(r.taxableIncome)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-red-600">
                      {formatVND(r.taxAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => handleMarkPaid(r.id)}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Đã nộp
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Chưa có bản ghi thuế
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
