'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Calendar } from 'lucide-react';

interface Lead {
  id: number;
  name: string;
  phone: string;
  source: string;
  stage: string;
  nextActionAt: string | null;
  nextActionNote: string | null;
  estimatedValue: number | null;
  createdAt: string;
}

const STAGE_COLOR: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-cyan-100 text-cyan-700',
  NEGOTIATING: 'bg-amber-100 text-amber-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

export default function CtvLeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [stage, setStage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: 'referral', interestNote: '', estimatedValue: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    if (stage) params.stage = stage;
    api.ctvLeadsList(params)
      .then((res) => setItems(res.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name, phone: form.phone, source: form.source,
        interestNote: form.interestNote || undefined,
      };
      if (form.estimatedValue) payload.estimatedValue = parseInt(form.estimatedValue, 10);
      await api.ctvLeadCreate(payload);
      setOpen(false);
      setForm({ name: '', phone: '', source: 'referral', interestNote: '', estimatedValue: '' });
      load();
    } catch (e) {
      setError((e as Error)?.message || 'Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Lead của tôi ({items.length})</h1>
        <Button onClick={() => setOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Thêm lead</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStage('')} className={`px-3 py-1 rounded text-sm ${stage === '' ? 'bg-primary text-white' : 'bg-muted'}`}>Tất cả</button>
        {['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'WON', 'LOST'].map((s) => (
          <button key={s} onClick={() => setStage(s)} className={`px-3 py-1 rounded text-sm ${stage === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Chưa có lead. Bấm "Thêm lead" để bắt đầu.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Est. Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded text-xs ${STAGE_COLOR[l.stage]}`}>{l.stage}</span></TableCell>
                    <TableCell>
                      {l.nextActionAt ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(l.nextActionAt).toLocaleDateString('vi-VN')}</div>
                          {l.nextActionNote && <div className="text-xs text-muted-foreground">{l.nextActionNote}</div>}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{l.estimatedValue ? new Intl.NumberFormat('vi-VN').format(Number(l.estimatedValue)) : '—'}</TableCell>
                    <TableCell>
                      <Link href={`/ctv/leads/${l.id}`} className="text-blue-600 text-sm">Chi tiết</Link>
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
          <DialogHeader><DialogTitle>Thêm lead mới</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên khách</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>SĐT</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label>Nguồn</Label>
              <select className="w-full border rounded px-2 py-2" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="referral">Giới thiệu</option>
                <option value="zalo">Zalo</option>
                <option value="fb_ads">FB Ads</option>
                <option value="event">Sự kiện</option>
                <option value="walk_in">Vào trực tiếp</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div><Label>Quan tâm gì</Label><Input value={form.interestNote} onChange={(e) => setForm({ ...form, interestNote: e.target.value })} /></div>
            <div><Label>Giá trị ước tính (VND)</Label><Input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} /></div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button onClick={submit} disabled={submitting || !form.name || !form.phone}>{submitting ? 'Đang lưu...' : 'Tạo lead'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
