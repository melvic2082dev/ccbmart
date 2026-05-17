'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode } from 'lucide-react';

interface Item {
  id: number;
  pickupCode: string | null;
  totalAmount: number;
  packedAt: string | null;
  ctv: { name: string; phone: string } | null;
  items: { id: number; quantity: number; product: { name: string } | null }[];
}

export default function AwaitingPickupPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.warehouseAwaitingPickup()
      .then((res) => setItems(res.items || []))
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode /> Chờ CTV lấy ({items.length})</h1>
        <Button variant="outline" onClick={load}>Tải lại</Button>
      </div>
      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <Card>
        <CardHeader>
          <CardTitle>Đơn đã đóng gói — chờ CTV đến quét mã</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Không có đơn nào chờ pickup.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>CTV</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead>Đóng gói lúc</TableHead>
                  <TableHead className="text-center">Mã pickup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono">#{it.id}</TableCell>
                    <TableCell>
                      <div>{it.ctv?.name}</div>
                      <div className="text-xs text-muted-foreground">{it.ctv?.phone}</div>
                    </TableCell>
                    <TableCell>
                      {it.items.slice(0, 2).map((li) => (
                        <div key={li.id} className="text-xs">×{li.quantity} {li.product?.name}</div>
                      ))}
                      {it.items.length > 2 && <span className="text-xs text-muted-foreground">+{it.items.length - 2}</span>}
                    </TableCell>
                    <TableCell className="text-right">{formatVND(Number(it.totalAmount))}</TableCell>
                    <TableCell className="text-xs">
                      {it.packedAt ? new Date(it.packedAt).toLocaleString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <code className="px-3 py-1 bg-primary/10 text-primary text-base font-mono font-bold rounded">
                        {it.pickupCode || '—'}
                      </code>
                      <div className="text-xs text-muted-foreground mt-1">CTV đọc / quét QR</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
