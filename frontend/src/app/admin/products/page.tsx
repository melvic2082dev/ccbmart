'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package } from 'lucide-react';

interface Variant {
  id: number;
  sku: string;
  name: string;
  basePrice: number;
  status: string;
}

interface Warehouse {
  id: number;
  code: string;
  name: string;
  address: string;
}

interface Product {
  id: number;
  name: string;
  slug: string | null;
  category: string;
  brand: string | null;
  price: number;
  unit: string;
  status: string;
  region: 'BAC' | 'TRUNG' | 'NAM' | null;
  warehouse: Warehouse | null;
  variants: Variant[];
}

const REGION_LABEL: Record<string, string> = { BAC: 'Bắc', TRUNG: 'Trung', NAM: 'Nam' };
const REGION_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  BAC: 'default',
  TRUNG: 'secondary',
  NAM: 'outline',
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.adminProductsList({ q, limit: 50 })
      .then((res) => { setItems(res.items || []); setTotal(res.total || 0); })
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package /> Sản phẩm ({total})</h1>
        <div className="flex gap-2">
          <Input placeholder="Tìm theo tên..." value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />
          <Button onClick={load}>Tìm</Button>
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
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Miền</TableHead>
                  <TableHead>Kho</TableHead>
                  <TableHead>Giá base</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Trạng thái</TableHead>
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
                      {p.region ? (
                        <Badge variant={REGION_VARIANT[p.region]}>{REGION_LABEL[p.region]}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.warehouse ? (
                        <div className="text-xs">
                          <div className="font-medium">{p.warehouse.code}</div>
                          <div className="text-muted-foreground">{p.warehouse.name}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatVND(Number(p.price))}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>
                      {p.variants && p.variants.length > 0 ? (
                        <div className="space-y-1">
                          {p.variants.map((v) => (
                            <div key={v.id} className="text-xs">
                              <code>{v.sku}</code> · {v.name} · {formatVND(Number(v.basePrice))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        v3.1 scaffold — full CRUD form via API (POST /api/admin/products, /admin/products/:id/variants, /admin/variants/:id).
      </div>
    </div>
  );
}
