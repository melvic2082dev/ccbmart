'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, CheckCircle2, XCircle } from 'lucide-react';

interface Item {
  id: number;
  totalAmount: number;
  draftedAt: string | null;
  ctv: { id: number; name: string; phone: string } | null;
  customer: { id: number; name: string; phone: string } | null;
  items: { id: number; quantity: number; product: { name: string; region: string | null } | null }[];
}

function regionLabel(r: string | null | undefined) {
  if (r === 'BAC') return 'Bắc';
  if (r === 'TRUNG') return 'Trung';
  if (r === 'NAM') return 'Nam';
  return '—';
}

export default function PendingInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.warehousePendingInventory()
      .then((res) => setItems(res.items || []))
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const confirm = async (id: number) => {
    setBusy(id);
    try { await api.warehouseConfirmInventory(id); load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };

  const reject = async (id: number) => {
    const reason = window.prompt('Lý do từ chối (ví dụ: hết hàng, hỏng hàng)…');
    if (!reason) return;
    setBusy(id);
    try { await api.warehouseRejectInventory(id, reason); load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList /> Chờ xác nhận tồn ({items.length})
        </h1>
        <Button variant="outline" onClick={load}>Tải lại</Button>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>Đơn CTV mới — cần xác nhận có/hết hàng trong 5 phút</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Không có đơn nào chờ xác nhận.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>CTV</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                  <TableHead className="text-center">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono">#{it.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{it.ctv?.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{it.ctv?.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div>{it.customer?.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{it.customer?.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {it.items.slice(0, 3).map((li) => (
                          <div key={li.id} className="text-xs">
                            ×{li.quantity} {li.product?.name}{' '}
                            <Badge variant="outline" className="ml-1">{regionLabel(li.product?.region)}</Badge>
                          </div>
                        ))}
                        {it.items.length > 3 && <div className="text-xs text-muted-foreground">+{it.items.length - 3} sản phẩm</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatVND(Number(it.totalAmount))}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {it.draftedAt ? new Date(it.draftedAt).toLocaleString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" disabled={busy === it.id} onClick={() => confirm(it.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Có hàng
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busy === it.id} onClick={() => reject(it.id)}>
                          <XCircle className="w-4 h-4 mr-1" /> Hết hàng
                        </Button>
                      </div>
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
