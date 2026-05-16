'use client';

import { useEffect, useState } from 'react';
import { api, formatVND, formatNumber } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Boxes } from 'lucide-react';

interface Batch {
  id: number;
  batchNo: string;
  qtyReceived: number;
  qtyAvailable: number;
  costPerUnit: number;
  mfgDate: string | null;
  expDate: string | null;
  status: string;
  variant: { id: number; sku: string; name: string; product: { name: string; category: string } };
  supplier: { id: number; name: string } | null;
}

function daysToExpiry(expDate: string | null): number | null {
  if (!expDate) return null;
  return Math.round((new Date(expDate).getTime() - Date.now()) / 86400000);
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'expiring'>('all');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = tab === 'expiring' ? { expiring: 30 } : {};
    api.adminInventoryList(params)
      .then((res) => setItems(res.items || []))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes /> Tồn kho lô ({items.length})</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('all')} className={`px-3 py-1 rounded ${tab === 'all' ? 'bg-primary text-white' : 'bg-muted'}`}>Tất cả ACTIVE</button>
        <button onClick={() => setTab('expiring')} className={`px-3 py-1 rounded ${tab === 'expiring' ? 'bg-primary text-white' : 'bg-muted'}`}>Sắp hết hạn (30 ngày)</button>
      </div>

      <Card>
        <CardHeader><CardTitle>Lô hàng</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Không có lô nào</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Sản phẩm / Variant (SKU)</TableHead>
                  <TableHead>Tồn / Nhập</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Hạn SD</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((b) => {
                  const days = daysToExpiry(b.expDate);
                  return (
                    <TableRow key={b.id}>
                      <TableCell><code>{b.batchNo}</code></TableCell>
                      <TableCell>
                        <div className="font-medium">{b.variant.product.name}</div>
                        <div className="text-xs text-muted-foreground">{b.variant.name} · <code>{b.variant.sku}</code></div>
                      </TableCell>
                      <TableCell>
                        <span className={b.qtyAvailable < b.qtyReceived * 0.2 ? 'text-orange-600 font-semibold' : ''}>
                          {formatNumber(b.qtyAvailable)} / {formatNumber(b.qtyReceived)}
                        </span>
                      </TableCell>
                      <TableCell>{formatVND(Number(b.costPerUnit))}</TableCell>
                      <TableCell>
                        {b.expDate ? (
                          <div>
                            {new Date(b.expDate).toLocaleDateString('vi-VN')}
                            {days !== null && (
                              <div className={`text-xs ${days < 7 ? 'text-red-600' : days < 30 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                {days > 0 ? `còn ${days} ngày` : `quá hạn ${-days} ngày`}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{b.supplier?.name || '—'}</TableCell>
                      <TableCell><Badge variant={b.status === 'ACTIVE' ? 'default' : 'secondary'}>{b.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
