'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Package, Pencil, ListPlus } from 'lucide-react';

interface SupplierLink {
  id: number;
  supplierId: number;
  isPreferred: boolean;
  costPerUnit: number;
  supplier: { id: number; name: string; type: string };
}
interface Variant {
  id: number;
  sku: string;
  name: string;
  basePrice: number;
  status: string;
  unit: string;
  supplierProducts?: SupplierLink[];
}
interface Warehouse { id: number; code: string; name: string; address: string }
interface Product {
  id: number;
  name: string;
  slug: string | null;
  category: string;
  brand: string | null;
  origin: string | null;
  description: string | null;
  region: 'BAC' | 'TRUNG' | 'NAM' | null;
  warehouseId: number | null;
  warehouse: Warehouse | null;
  price: number;
  cogsPct: number;
  unit: string;
  status: string;
  variants: Variant[];
}

const REGION_LABEL: Record<string, string> = { BAC: 'Bắc', TRUNG: 'Trung', NAM: 'Nam' };
const REGION_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  BAC: 'default', TRUNG: 'secondary', NAM: 'outline',
};

type ProductForm = {
  id: number | null;
  name: string; slug: string; category: string; brand: string; origin: string;
  description: string;
  region: '' | 'BAC' | 'TRUNG' | 'NAM';
  warehouseId: string;
  price: string; cogsPct: string; unit: string;
  status: 'ACTIVE' | 'INACTIVE';
};
const EMPTY: ProductForm = {
  id: null, name: '', slug: '', category: '', brand: '', origin: '', description: '',
  region: '', warehouseId: '', price: '0', cogsPct: '0.5', unit: 'cái', status: 'ACTIVE',
};

type VariantForm = { productId: number; sku: string; name: string; unit: string; basePrice: string; cogsPct: string };

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState<VariantForm | null>(null);

  const load = () => {
    setLoading(true);
    api.adminProductsList({ q, limit: 100 })
      .then((res) => { setItems(res.items || []); setTotal(res.total || 0); })
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.adminWarehousesList().then((res) => setWarehouses(res.items || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (p: Product) => {
    setForm({
      id: p.id, name: p.name, slug: p.slug || '', category: p.category, brand: p.brand || '',
      origin: p.origin || '', description: p.description || '',
      region: (p.region as ProductForm['region']) || '',
      warehouseId: p.warehouseId ? String(p.warehouseId) : '',
      price: String(Number(p.price) || 0), cogsPct: String(Number(p.cogsPct) || 0.5),
      unit: p.unit, status: (p.status as ProductForm['status']) || 'ACTIVE',
    });
    setOpen(true);
  };
  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        category: form.category.trim(),
        brand: form.brand.trim() || null,
        origin: form.origin.trim() || null,
        description: form.description.trim() || null,
        region: form.region || null,
        warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
        price: Number(form.price) || 0,
        cogsPct: Number(form.cogsPct) || 0.5,
        unit: form.unit.trim() || 'cái',
        status: form.status,
      };
      if (form.id) await api.adminProductUpdate(form.id, payload);
      else await api.adminProductCreate(payload);
      setOpen(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openAddVariant = (p: Product) => {
    setVForm({
      productId: p.id, sku: '', name: `${p.name} — quy cách 1`,
      unit: p.unit, basePrice: String(p.price), cogsPct: String(p.cogsPct),
    });
    setVOpen(true);
  };
  const saveVariant = async () => {
    if (!vForm) return;
    setSubmitting(true);
    try {
      await api.adminVariantCreate(vForm.productId, {
        sku: vForm.sku.trim(),
        name: vForm.name.trim(),
        unit: vForm.unit.trim(),
        basePrice: Number(vForm.basePrice) || 0,
        cogsPct: Number(vForm.cogsPct) || 0.5,
      });
      setVOpen(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package /> Sản phẩm ({total})</h1>
        <div className="flex gap-2">
          <Input placeholder="Tìm theo tên…" value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />
          <Button variant="outline" onClick={load}>Tìm</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Tạo SP</Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>Danh sách sản phẩm + variants</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>DM</TableHead>
                  <TableHead>Miền</TableHead>
                  <TableHead>Kho</TableHead>
                  <TableHead>Giá</TableHead>
                  <TableHead>ĐV</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead>TT</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.slug && <div className="text-xs text-muted-foreground">/{p.slug}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                    <TableCell>
                      {p.region ? <Badge variant={REGION_VARIANT[p.region]}>{REGION_LABEL[p.region]}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.warehouse ? <><div className="font-medium">{p.warehouse.code}</div><div className="text-muted-foreground">{p.warehouse.name}</div></>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{formatVND(Number(p.price))}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>
                      {p.variants && p.variants.length > 0 ? (
                        <div className="space-y-0.5 text-xs">
                          {p.variants.map((v) => (
                            <div key={v.id}><code>{v.sku}</code> · {formatVND(Number(v.basePrice))}</div>
                          ))}
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        // Gom supplier từ tất cả variants, ưu tiên isPreferred
                        const sps = (p.variants || []).flatMap((v) => v.supplierProducts || []);
                        if (sps.length === 0) return <span className="text-muted-foreground">—</span>;
                        const preferred = sps.find((sp) => sp.isPreferred) || sps[0];
                        const more = new Set(sps.map((sp) => sp.supplier.id)).size - 1;
                        return (
                          <div>
                            <div className="font-medium">{preferred.supplier.name}</div>
                            <div className="text-muted-foreground">
                              {preferred.isPreferred ? '★ Ưu tiên' : ''} · {formatVND(Number(preferred.costPerUnit))}/đv
                              {more > 0 && <span> · +{more} NCC khác</span>}
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell><Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="w-3 h-3 mr-1" /> Sửa</Button>
                        <Button size="sm" variant="secondary" onClick={() => openAddVariant(p)}><ListPlus className="w-3 h-3 mr-1" /> Variant</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? `Sửa sản phẩm #${form.id}` : 'Tạo sản phẩm mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tên *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-tạo từ tên" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Danh mục *</Label><Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="NS / TPCN / FMCG…" /></div>
              <div><Label>Thương hiệu</Label><Input value={form.brand} onChange={(e) => set('brand', e.target.value)} /></div>
              <div><Label>Xuất xứ</Label><Input value={form.origin} onChange={(e) => set('origin', e.target.value)} placeholder="Sóc Trăng / Hà Nội…" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Miền</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.region}
                  onChange={(e) => set('region', e.target.value as ProductForm['region'])}>
                  <option value="">— Không gán —</option>
                  <option value="BAC">Bắc</option>
                  <option value="TRUNG">Trung</option>
                  <option value="NAM">Nam</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label>Kho</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.warehouseId}
                  onChange={(e) => set('warehouseId', e.target.value)}>
                  <option value="">— Không gán —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Giá bán *</Label><Input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
              <div><Label>COGS% (0-1) *</Label><Input type="number" step="0.01" value={form.cogsPct} onChange={(e) => set('cogsPct', e.target.value)} /></div>
              <div><Label>Đơn vị *</Label><Input value={form.unit} onChange={(e) => set('unit', e.target.value)} /></div>
            </div>
            <div>
              <Label>Trạng thái</Label>
              <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.status}
                onChange={(e) => set('status', e.target.value as ProductForm['status'])}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div><Label>Mô tả</Label>
              <textarea className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button disabled={submitting || !form.name.trim() || !form.category.trim() || !form.unit.trim()} onClick={save}>
              {submitting ? 'Đang lưu…' : form.id ? 'Cập nhật' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Add dialog */}
      <Dialog open={vOpen} onOpenChange={setVOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm variant (quy cách)</DialogTitle></DialogHeader>
          {vForm && (
            <div className="grid gap-3">
              <div><Label>SKU *</Label><Input value={vForm.sku} onChange={(e) => setVForm({ ...vForm, sku: e.target.value.toUpperCase() })} placeholder="GAO-ST25-5KG" /></div>
              <div><Label>Tên variant *</Label><Input value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Đơn vị</Label><Input value={vForm.unit} onChange={(e) => setVForm({ ...vForm, unit: e.target.value })} /></div>
                <div><Label>Giá base</Label><Input type="number" value={vForm.basePrice} onChange={(e) => setVForm({ ...vForm, basePrice: e.target.value })} /></div>
                <div><Label>COGS%</Label><Input type="number" step="0.01" value={vForm.cogsPct} onChange={(e) => setVForm({ ...vForm, cogsPct: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVOpen(false)}>Huỷ</Button>
            <Button disabled={submitting || !vForm?.sku.trim()} onClick={saveVariant}>
              {submitting ? 'Đang lưu…' : 'Tạo variant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
