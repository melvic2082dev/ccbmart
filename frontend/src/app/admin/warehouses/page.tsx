'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Warehouse, Plus, Pencil, PowerOff, Power } from 'lucide-react';

interface WarehouseRow {
  id: number;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
  _count?: { products: number; transactions: number; staff: number };
}

type WForm = {
  id: number | null;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
};
const EMPTY: WForm = { id: null, code: '', name: '', address: '', isActive: true };

export default function AdminWarehousesPage() {
  const [items, setItems] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    const url = showInactive ? '/admin/warehouses?onlyActive=false' : '/admin/warehouses';
    // Direct fetch since we toggle the query
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}${url}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then((r) => r.json())
      .then((res) => setItems(res.items || []))
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showInactive]);

  const openCreate = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (w: WarehouseRow) => {
    setForm({ id: w.id, code: w.code, name: w.name, address: w.address, isActive: w.isActive });
    setOpen(true);
  };
  const set = <K extends keyof WForm>(k: K, v: WForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        address: form.address.trim(),
        isActive: form.isActive,
      };
      if (!payload.code || !payload.name || !payload.address) throw new Error('Nhập đủ code / tên / địa chỉ');

      const base = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/admin/warehouses${form.id ? `/${form.id}` : ''}`;
      const res = await fetch(base, {
        method: form.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setOpen(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (w: WarehouseRow) => {
    if (w.isActive) {
      if (!window.confirm(`Tắt kho "${w.name}"? Sản phẩm + giao dịch vẫn còn ở kho này nhưng kho sẽ ẩn khỏi dropdown.`)) return;
      const base = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/admin/warehouses/${w.id}`;
      await fetch(base, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
    } else {
      // Re-activate
      const base = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/admin/warehouses/${w.id}`;
      await fetch(base, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ isActive: true }),
      });
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Warehouse /> Kho ({items.length})</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm flex items-center gap-1">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Hiển thị kho đã tắt
          </label>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Tạo kho</Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>Danh sách kho</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead className="text-right">SP</TableHead>
                  <TableHead className="text-right">Giao dịch</TableHead>
                  <TableHead className="text-right">Thủ kho</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.id}</TableCell>
                    <TableCell><code className="font-mono">{w.code}</code></TableCell>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-sm">{w.address}</TableCell>
                    <TableCell className="text-right">{w._count?.products ?? 0}</TableCell>
                    <TableCell className="text-right">{w._count?.transactions ?? 0}</TableCell>
                    <TableCell className="text-right">{w._count?.staff ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={w.isActive ? 'default' : 'secondary'}>{w.isActive ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(w)}><Pencil className="w-3 h-3 mr-1" /> Sửa</Button>
                        {w.isActive ? (
                          <Button size="sm" variant="destructive" onClick={() => toggleActive(w)}><PowerOff className="w-3 h-3 mr-1" /> Tắt</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => toggleActive(w)}><Power className="w-3 h-3 mr-1" /> Bật</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? `Sửa kho #${form.id}` : 'Tạo kho mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())}
                  className="font-mono" placeholder="VD: NTS" disabled={!!form.id} />
                {form.id && <div className="text-xs text-muted-foreground mt-1">Không đổi code sau khi tạo</div>}
              </div>
              <div className="col-span-2">
                <Label>Tên *</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Kho Ngã Tư Sở" />
              </div>
            </div>
            <div>
              <Label>Địa chỉ *</Label>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="137 Nguyễn Ngọc Vũ, Trung Hoà, Cầu Giấy, Hà Nội" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button disabled={submitting || !form.code.trim() || !form.name.trim() || !form.address.trim()} onClick={save}>
              {submitting ? 'Đang lưu…' : form.id ? 'Cập nhật' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
