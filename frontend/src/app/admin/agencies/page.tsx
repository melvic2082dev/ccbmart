'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';

interface Agency {
  id: number;
  name: string;
  depositAmount: number;
  depositTier: string;
  address: string;
  user: { name: string; email: string; phone: string };
  inventoryWarnings: { id: number; warningType: string; product: { name: string }; quantity: number; expiryDate: string }[];
  transactions: number;
  totalRevenue: number;
}

export default function AdminAgencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminAgencies().then((data) => {
      setAgencies(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalDeposit = agencies.reduce((s, a) => s + a.depositAmount, 0);
  const totalRevenue = agencies.reduce((s, a) => s + a.totalRevenue, 0);
  const totalWarnings = agencies.reduce((s, a) => s + a.inventoryWarnings.length, 0);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">Quản lý Đại lý</h2>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg"><Building2 className="text-emerald-600" size={20} /></div>
                  <div>
                    <p className="text-sm text-slate-500">Tổng đại lý</p>
                    <p className="text-2xl font-bold">{agencies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Wallet className="text-blue-600" size={20} /></div>
                  <div>
                    <p className="text-sm text-slate-500">Tổng đặt cọc</p>
                    <p className="text-2xl font-bold">{formatVND(totalDeposit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="text-amber-600" size={20} /></div>
                  <div>
                    <p className="text-sm text-slate-500">Tổng doanh thu</p>
                    <p className="text-2xl font-bold">{formatVND(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="text-red-600" size={20} /></div>
                  <div>
                    <p className="text-sm text-slate-500">Cảnh báo tồn kho</p>
                    <p className="text-2xl font-bold">{totalWarnings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle>Danh sách đại lý</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên đại lý</TableHead>
                    <TableHead>Chủ đại lý</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>Đặt cọc</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead className="text-right">Giao dịch</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead>Cảnh báo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.user.name}</TableCell>
                      <TableCell>{a.user.phone}</TableCell>
                      <TableCell>{formatVND(a.depositAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={a.depositTier === '300tr' ? 'default' : a.depositTier === '100tr' ? 'secondary' : 'outline'}>
                          {a.depositTier}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{a.address}</TableCell>
                      <TableCell className="text-right">{a.transactions}</TableCell>
                      <TableCell className="text-right">{formatVND(a.totalRevenue)}</TableCell>
                      <TableCell>
                        {a.inventoryWarnings.length > 0 ? (
                          <Badge variant="destructive">{a.inventoryWarnings.length} cảnh báo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {agencies.filter(a => a.inventoryWarnings.length > 0).map((a) => (
            <Card key={a.id} className="mb-4 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Cảnh báo tồn kho - {a.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Hạn sử dụng</TableHead>
                      <TableHead>Loại</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.inventoryWarnings.map((w) => (
                      <TableRow key={w.id} className={w.warningType === 'expired' ? 'bg-red-50' : w.warningType === 'expiring_soon' ? 'bg-yellow-50' : ''}>
                        <TableCell>{w.product.name}</TableCell>
                        <TableCell>{w.quantity}</TableCell>
                        <TableCell>{new Date(w.expiryDate).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell>
                          <Badge variant={w.warningType === 'low_stock' ? 'destructive' : w.warningType === 'expiring_soon' ? 'secondary' : 'destructive'}>
                            {w.warningType === 'low_stock' ? 'Sắp hết' : w.warningType === 'expiring_soon' ? 'Sắp hết hạn' : 'Hết hạn'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </DashboardLayout>
  );
}
