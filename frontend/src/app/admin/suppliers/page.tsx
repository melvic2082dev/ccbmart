'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Truck, Plus, Pencil, PowerOff } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  type: string;
  taxCode: string | null;
  contactName: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  _count?: { batches: number; supplierProducts: number };
}

type FormState = {
  id: number | null;
  name: string;
  type: 'ccb_household' | 'external';
  taxCode: string;
  contactName: string;
  contactPhone: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  id: null, name: '', type: 'ccb_household', taxCode: '', contactName: '',
  contactPhone: '', address: '', notes: '', isActive: true,
};

export default function AdminSuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.adminSuppliersList()
      .then((res) => setItems(res.items || []))
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (s: Supplier) => {
    setForm({
      id: s.id, name: s.name, type: (s.type as 'ccb_household' | 'external') || 'external',
      taxCode: s.taxCode || '', contactName: s.contactName || '',
      contactPhone: s.contactPhone || '', address: s.address || '',
      notes: s.notes || '', isActive: s.isActive,
    });
    setOpen(true);
  };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        taxCode: form.taxCode.trim() || null,
        contactName: form.contactName.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        isActive: form.isActive,
      };
      if (form.id) {
        await api.adminSupplierUpdate(form.id, payload);
      } else {
        await api.adminSupplierCreate(payload);
      }
      setOpen(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (s: Supplier) => {
    if (!window.confirm(`Vô hiệu hoá "${s.name}"?`)) return;
    try { await api.adminSupplierDeactivate(s.id); load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Truck /> Nhà cung cấp ({items.length})</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Tạo NCC</Button>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>Danh sách Supplier</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Mã thuế</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.id}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant={s.type === 'ccb_household' ? 'default' : 'outline'}>
                        {s.type === 'ccb_household' ? 'Hộ KD CCB' : 'Bên ngoài'}
                      </Badge>
                    </TableCell>
                    <TableCell><code>{s.taxCode || '—'}</code></TableCell>
                    <TableCell>{s.contactPhone || '—'}</TableCell>
                    <TableCell className="text-sm">{s.address || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? 'default' : 'secondary'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                          <Pencil className="w-3 h-3 mr-1" /> Sửa
                        </Button>
                        {s.isActive && (
                          <Button size="sm" variant="destructive" onClick={() => deactivate(s)}>
                            <PowerOff className="w-3 h-3 mr-1" /> Tắt
                          </Button>
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
            <DialogTitle>{form.id ? `Sửa NCC #${form.id}` : 'Tạo nhà cung cấp mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Tên *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loại</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.type}
                  onChange={(e) => set('type', e.target.value as FormState['type'])}>
                  <option value="ccb_household">Hộ kinh doanh CCB</option>
                  <option value="external">Bên ngoài</option>
                </select>
              </div>
              <div>
                <Label>Mã thuế</Label>
                <Input value={form.taxCode} onChange={(e) => set('taxCode', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Người liên hệ</Label><Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} /></div>
              <div><Label>SĐT</Label><Input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></div>
            </div>
            <div><Label>Địa chỉ</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
            <div><Label>Ghi chú</Label><Input value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button disabled={submitting || !form.name.trim()} onClick={save}>
              {submitting ? 'Đang lưu…' : form.id ? 'Cập nhật' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
