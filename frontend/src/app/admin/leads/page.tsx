'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';

interface Lead {
  id: number;
  name: string;
  phone: string;
  source: string;
  stage: string;
  estimatedValue: number | null;
  createdAt: string;
  closedAt: string | null;
  assignedCtv: { id: number; name: string; rank: string | null };
}

const STAGE_COLOR: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-cyan-100 text-cyan-700',
  NEGOTIATING: 'bg-amber-100 text-amber-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

export default function AdminLeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { limit: 100 };
    if (stage) params.stage = stage;
    api.adminLeadsList(params)
      .then((res) => { setItems(res.items || []); setTotal(res.total || 0); })
      .finally(() => setLoading(false));
  }, [stage]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Users /> Leads ({total})</h1>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStage('')} className={`px-3 py-1 rounded text-sm ${stage === '' ? 'bg-primary text-white' : 'bg-muted'}`}>Tất cả</button>
        {['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'WON', 'LOST'].map((s) => (
          <button key={s} onClick={() => setStage(s)} className={`px-3 py-1 rounded text-sm ${stage === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Danh sách lead</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Est. Value</TableHead>
                  <TableHead>CTV phụ trách</TableHead>
                  <TableHead>Tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.id}</TableCell>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell><Badge variant="outline">{l.source}</Badge></TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${STAGE_COLOR[l.stage] || ''}`}>{l.stage}</span>
                    </TableCell>
                    <TableCell>{l.estimatedValue ? new Intl.NumberFormat('vi-VN').format(Number(l.estimatedValue)) : '—'}</TableCell>
                    <TableCell>{l.assignedCtv?.name} <span className="text-xs text-muted-foreground">({l.assignedCtv?.rank || '?'})</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(l.createdAt).toLocaleDateString('vi-VN')}</TableCell>
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
