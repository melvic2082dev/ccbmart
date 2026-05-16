'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  type: string;
  taxCode: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  _count?: { batches: number; supplierProducts: number };
}

export default function AdminSuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminSuppliersList()
      .then((res) => setItems(res.items || []))
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Truck /> Nhà cung cấp ({items.length})</h1>

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
                  <TableHead>Số batch</TableHead>
                  <TableHead>Trạng thái</TableHead>
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
                    <TableCell>{s._count?.batches ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? 'default' : 'secondary'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
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
