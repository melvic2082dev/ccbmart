'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackageCheck, Play, CheckCheck } from 'lucide-react';

interface Item {
  id: number;
  status: string;
  totalAmount: number;
  paidAt: string | null;
  packingStartedAt: string | null;
  ctv: { name: string } | null;
  customer: { name: string; phone: string } | null;
  items: { id: number; quantity: number; product: { name: string } | null }[];
}

export default function PackingPage() {
  const [awaiting, setAwaiting] = useState<Item[]>([]);
  const [active, setActive]     = useState<Item[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.warehouseAwaitingPacking(), api.warehousePacking()])
      .then(([a, b]) => { setAwaiting(a.items || []); setActive(b.items || []); })
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const start  = async (id: number) => { setBusy(id); try { await api.warehouseStartPacking(id); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); } };
  const finish = async (id: number) => { setBusy(id); try { await api.warehouseFinishPacking(id); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); } };

  const list = (title: string, rows: Item[], action: 'start' | 'finish') => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck size={20} /> {title} ({rows.length})</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Không có đơn nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>CTV / Khách</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="text-right">Tổng</TableHead>
                <TableHead>{action === 'start' ? 'Thanh toán lúc' : 'Bắt đầu soạn'}</TableHead>
                <TableHead className="text-center">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono">#{it.id}</TableCell>
                  <TableCell>
                    <div className="text-sm">{it.ctv?.name}</div>
                    <div className="text-xs text-muted-foreground">{it.customer?.name} · {it.customer?.phone}</div>
                  </TableCell>
                  <TableCell>
                    {it.items.slice(0, 2).map((li) => (
                      <div key={li.id} className="text-xs">×{li.quantity} {li.product?.name}</div>
                    ))}
                    {it.items.length > 2 && <Badge variant="outline">+{it.items.length - 2}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{formatVND(Number(it.totalAmount))}</TableCell>
                  <TableCell className="text-xs">
                    {action === 'start'
                      ? (it.paidAt ? new Date(it.paidAt).toLocaleString('vi-VN') : '—')
                      : (it.packingStartedAt ? new Date(it.packingStartedAt).toLocaleString('vi-VN') : '—')}
                  </TableCell>
                  <TableCell className="text-center">
                    {action === 'start' ? (
                      <Button size="sm" disabled={busy === it.id} onClick={() => start(it.id)}>
                        <Play className="w-4 h-4 mr-1" /> Bắt đầu soạn
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busy === it.id} onClick={() => finish(it.id)}>
                        <CheckCheck className="w-4 h-4 mr-1" /> Xong, sinh mã pickup
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><PackageCheck /> Soạn hàng</h1>
        <Button variant="outline" onClick={load}>Tải lại</Button>
      </div>
      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}
      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Đang tải…</CardContent></Card>
      ) : (
        <>
          {list('Đã thanh toán — sẵn sàng soạn', awaiting, 'start')}
          {list('Đang soạn', active, 'finish')}
        </>
      )}
    </div>
  );
}
