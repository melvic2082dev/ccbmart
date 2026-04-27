'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Play, Eye, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PAGE_SIZE_TAX = 10;

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
  const [page, setPage] = useState(1);
  const [viewCertFor, setViewCertFor] = useState<TaxRecord | null>(null);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [month]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [month]);

  const pagedRecords = useMemo(
    () => records.slice((page - 1) * PAGE_SIZE_TAX, page * PAGE_SIZE_TAX),
    [records, page]
  );
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE_TAX));

  const paymentInfo = (r: TaxRecord) => {
    return { paidAt: null as string | null, cert: null as string | null };
  };

  const exportTaxReport = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const url = api.adminTaxExportXmlUrl(month);
      const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tax-report-${month}.xml`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`Xuất XML thất bại: ${(e as Error).message}`);
    }
  };

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
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Calculator size={24} /> Thuế TNCN 10%
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
          <Play size={16} /> {processing ? 'Đang tính…' : 'Tính thuế tháng'}
        </button>
        <Button variant="outline" size="sm" onClick={exportTaxReport} className="ml-auto">
          <FileText className="w-4 h-4 mr-1" /> Xuất báo cáo thuế tháng (XML)
        </Button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Bảng thuế ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người nộp</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>HKD</TableHead>
                    <TableHead>Tháng</TableHead>
                    <TableHead className="text-right">Thu nhập</TableHead>
                    <TableHead className="text-right">Thuế 10%</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày nộp</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRecords.map((r) => {
                    const pi = paymentInfo(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.user.name}</TableCell>
                        <TableCell><Badge variant="outline">{r.user.rank || '—'}</Badge></TableCell>
                        <TableCell>
                          {r.user.isBusinessHousehold ? <Badge className="bg-blue-100 text-blue-700">HKD</Badge> : <Badge variant="outline">Cá nhân</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.month}</TableCell>
                        <TableCell className="text-right font-mono">{formatVND(r.taxableIncome)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-red-600">{formatVND(r.taxAmount)}</TableCell>
                        <TableCell>
                          <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {r.status === 'PAID' ? 'Đã nộp' : r.status === 'PENDING' ? 'Chờ nộp' : r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">{pi.paidAt ? new Date(pi.paidAt).toLocaleDateString('vi-VN') : '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {r.status === 'PENDING' ? (
                              <Button variant="outline" size="sm" onClick={() => handleMarkPaid(r.id)}>Đánh dấu đã nộp</Button>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon-sm" title="Xem chứng từ" onClick={() => setViewCertFor(r)}><Eye className="w-4 h-4 text-blue-600" /></Button>
                                <Button variant="ghost" size="icon-sm" title="Xuất chứng từ PDF" onClick={() => alert(`Xuất chứng từ ${pi.cert} (PDF)`)}><Download className="w-4 h-4 text-emerald-600" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pagedRecords.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-500">Chưa có bản ghi thuế</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile compact card */}
            <div className="md:hidden space-y-2">
              {pagedRecords.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Chưa có bản ghi thuế</p>
              ) : pagedRecords.map((r) => {
                const pi = paymentInfo(r);
                return (
                  <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-xs shrink-0">{r.user.rank || '—'}</Badge>
                        <p className="font-medium text-gray-800 truncate">{r.user.name}</p>
                      </div>
                      <Badge className={r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {r.status === 'PAID' ? 'Đã nộp' : r.status === 'PENDING' ? 'Chờ nộp' : r.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {r.user.isBusinessHousehold ? <Badge className="bg-blue-100 text-blue-700 text-[10px] py-0">HKD</Badge> : <Badge variant="outline" className="text-[10px] py-0">Cá nhân</Badge>}
                      <span>· Tháng {r.month}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-[10px] uppercase text-gray-500">Thu nhập</p>
                        <p className="text-sm font-semibold text-gray-800 tabular-nums">{formatVND(r.taxableIncome)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-500">Thuế 10%</p>
                        <p className="text-sm font-semibold text-red-600 tabular-nums">{formatVND(r.taxAmount)}</p>
                      </div>
                    </div>
                    {pi.paidAt && (
                      <p className="text-xs text-gray-500">Nộp ngày: {new Date(pi.paidAt).toLocaleDateString('vi-VN')}</p>
                    )}
                    <div className="flex gap-2 pt-2 border-t">
                      {r.status === 'PENDING' ? (
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleMarkPaid(r.id)}>Đánh dấu đã nộp</Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewCertFor(r)}>
                            <Eye className="w-4 h-4 mr-1 text-blue-600" /> Chứng từ
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => alert(`Xuất chứng từ ${pi.cert} (PDF)`)}>
                            <Download className="w-4 h-4 text-emerald-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {records.length > PAGE_SIZE_TAX && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                <p className="text-gray-500">Trang {page}/{totalPages}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau →</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chứng từ viewer */}
      {viewCertFor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setViewCertFor(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[480px] max-w-[90vw] space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Chứng từ thuế TNCN</h3>
            {(() => {
              const pi = paymentInfo(viewCertFor);
              return (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Số chứng từ:</span> <span className="font-mono">{pi.cert}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người nộp:</span> <span className="font-medium">{viewCertFor.user.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tháng:</span> <span>{viewCertFor.month}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Thu nhập chịu thuế:</span> <span>{formatVND(viewCertFor.taxableIncome)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Thuế 10%:</span> <span className="font-semibold text-red-600">{formatVND(viewCertFor.taxAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày nộp:</span> <span>{pi.paidAt ? new Date(pi.paidAt).toLocaleDateString('vi-VN') : '—'}</span></div>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewCertFor(null)} className="flex-1">Đóng</Button>
              <Button className="flex-1" onClick={() => alert('Tải chứng từ PDF (mock)')}>
                <Download className="w-4 h-4 mr-1" /> Tải PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
