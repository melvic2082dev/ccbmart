'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, formatVND, formatNumber } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Boxes, PackagePlus } from 'lucide-react';

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
interface ProductLite { id: number; name: string; variants: { id: number; sku: string; name: string; basePrice: number }[] }
interface Supplier { id: number; name: string }

function daysToExpiry(expDate: string | null): number | null {
  if (!expDate) return null;
  return Math.round((new Date(expDate).getTime() - Date.now()) / 86400000);
}

type ReceiveForm = {
  productId: string; variantId: string; supplierId: string;
  batchNo: string; qtyReceived: string; costPerUnit: string;
  mfgDate: string; expDate: string;
};
const EMPTY: ReceiveForm = {
  productId: '', variantId: '', supplierId: '',
  batchNo: '', qtyReceived: '', costPerUnit: '',
  mfgDate: '', expDate: '',
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'expiring'>('all');
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductLite[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ReceiveForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = tab === 'expiring' ? { expiring: 30 } : {};
    api.adminInventoryList(params)
      .then((res) => setItems(res.items || []))
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  const loadLookups = () => {
    api.adminProductsList({ limit: 200 }).then((res) => setProducts(res.items || [])).catch(() => {});
    api.adminSuppliersList().then((res) => setSuppliers(res.items || [])).catch(() => {});
  };

  const openCreate = () => {
    setForm(EMPTY);
    loadLookups();
    setOpen(true);
  };

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === form.productId),
    [products, form.productId]
  );
  const variantOptions = selectedProduct?.variants || [];

  const set = <K extends keyof ReceiveForm>(k: K, v: ReceiveForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const variantId = parseInt(form.variantId, 10);
      if (!variantId) throw new Error('Chọn variant');
      if (!form.batchNo.trim()) throw new Error('Nhập mã lô');
      const qty = Number(form.qtyReceived);
      if (!qty || qty <= 0) throw new Error('Số lượng phải > 0');
      const payload: Record<string, unknown> = {
        batchNo: form.batchNo.trim(),
        qtyReceived: qty,
        costPerUnit: Number(form.costPerUnit) || 0,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        mfgDate: form.mfgDate || null,
        expDate: form.expDate || null,
      };
      await api.adminBatchReceive(variantId, payload);
      setOpen(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes /> Tồn kho lô ({items.length})</h1>
        <Button onClick={openCreate}><PackagePlus className="w-4 h-4 mr-1" /> Nhận lô mới</Button>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nhận lô hàng mới</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sản phẩm *</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.productId}
                  onChange={(e) => { set('productId', e.target.value); set('variantId', ''); }}>
                  <option value="">— chọn —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Variant (SKU) *</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.variantId}
                  onChange={(e) => set('variantId', e.target.value)} disabled={!variantOptions.length}>
                  <option value="">{variantOptions.length ? '— chọn —' : '(chọn sản phẩm trước)'}</option>
                  {variantOptions.map((v) => <option key={v.id} value={v.id}>{v.sku} · {v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mã lô *</Label><Input value={form.batchNo} onChange={(e) => set('batchNo', e.target.value)} placeholder="LOT-2026-001" /></div>
              <div>
                <Label>Nhà cung cấp</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.supplierId}
                  onChange={(e) => set('supplierId', e.target.value)}>
                  <option value="">— không gán —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Số lượng nhập *</Label><Input type="number" value={form.qtyReceived} onChange={(e) => set('qtyReceived', e.target.value)} /></div>
              <div><Label>Giá vốn / đv *</Label><Input type="number" value={form.costPerUnit} onChange={(e) => set('costPerUnit', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ngày SX</Label><Input type="date" value={form.mfgDate} onChange={(e) => set('mfgDate', e.target.value)} /></div>
              <div><Label>Hạn SD</Label><Input type="date" value={form.expDate} onChange={(e) => set('expDate', e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button disabled={submitting} onClick={save}>{submitting ? 'Đang lưu…' : 'Nhận hàng'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
