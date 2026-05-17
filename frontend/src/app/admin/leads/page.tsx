'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhoneCall, Plus, Pencil, Trash2 } from 'lucide-react';

interface Lead {
  id: number;
  name: string;
  phone: string;
  source: string;
  stage: string;
  estimatedValue: number | null;
  interestNote: string | null;
  createdAt: string;
  closedAt: string | null;
  assignedCtv: { id: number; name: string; rank: string | null };
}
interface CtvLite { id: number; name: string; rank: string | null }

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'WON', 'LOST'] as const;
const STAGE_COLOR: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-cyan-100 text-cyan-700',
  NEGOTIATING: 'bg-amber-100 text-amber-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};
const SOURCES = ['admin', 'phone', 'facebook', 'zalo', 'referral', 'walk_in', 'other'];

type LeadForm = {
  id: number | null;
  name: string; phone: string; source: string; stage: string;
  estimatedValue: string; assignedCtvId: string; notes: string;
};
const EMPTY: LeadForm = {
  id: null, name: '', phone: '', source: 'admin', stage: 'NEW',
  estimatedValue: '', assignedCtvId: '', notes: '',
};

export default function AdminLeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ctvs, setCtvs] = useState<CtvLite[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeadForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = { limit: 100 };
    if (stage) params.stage = stage;
    api.adminLeadsList(params)
      .then((res) => { setItems(res.items || []); setTotal(res.total || 0); })
      .catch((e) => setError(e?.message || 'Lỗi tải'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stage]);

  useEffect(() => {
    api.adminCtvsList()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.items || res.ctvs || [];
        setCtvs(list.map((c: { id: number; name: string; rank: string | null }) => ({ id: c.id, name: c.name, rank: c.rank })));
      })
      .catch(() => {});
  }, []);

  const openCreate = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (l: Lead) => {
    setForm({
      id: l.id, name: l.name, phone: l.phone, source: l.source, stage: l.stage,
      estimatedValue: l.estimatedValue ? String(l.estimatedValue) : '',
      assignedCtvId: String(l.assignedCtv?.id || ''),
      notes: l.interestNote || '',
    });
    setOpen(true);
  };
  const set = <K extends keyof LeadForm>(k: K, v: LeadForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        source: form.source,
        stage: form.stage,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        assignedCtvId: form.assignedCtvId ? Number(form.assignedCtvId) : null,
        notes: form.notes.trim() || null,
      };
      if (!payload.name || !payload.phone) throw new Error('Nhập tên + số điện thoại');
      if (!payload.assignedCtvId) throw new Error('Chọn CTV phụ trách');
      if (form.id) await api.adminLeadUpdate(form.id, payload);
      else await api.adminLeadCreate(payload);
      setOpen(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setSubmitting(false); }
  };

  const quickStage = async (l: Lead, nextStage: string) => {
    try { await api.adminLeadUpdate(l.id, { stage: nextStage }); load(); }
    catch (e) { setError((e as Error).message); }
  };

  const removeLead = async (l: Lead) => {
    if (!window.confirm(`Xoá lead "${l.name}" (#${l.id})?`)) return;
    try { await api.adminLeadDelete(l.id); load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><PhoneCall /> Leads ({total})</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Tạo lead</Button>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStage('')} className={`px-3 py-1 rounded text-sm ${stage === '' ? 'bg-primary text-white' : 'bg-muted'}`}>Tất cả</button>
        {STAGES.map((s) => (
          <button key={s} onClick={() => setStage(s)} className={`px-3 py-1 rounded text-sm ${stage === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Danh sách lead</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Chưa có lead nào.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Giá trị ước</TableHead>
                  <TableHead>CTV phụ trách</TableHead>
                  <TableHead>Tạo</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.id}</TableCell>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded border">{l.source}</span></TableCell>
                    <TableCell>
                      <select className={`px-2 py-1 rounded text-xs border ${STAGE_COLOR[l.stage] || ''}`} value={l.stage}
                        onChange={(e) => quickStage(l, e.target.value)}>
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </TableCell>
                    <TableCell>{l.estimatedValue ? new Intl.NumberFormat('vi-VN').format(Number(l.estimatedValue)) : '—'}</TableCell>
                    <TableCell>{l.assignedCtv?.name} <span className="text-xs text-muted-foreground">({l.assignedCtv?.rank || '?'})</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(l)}><Pencil className="w-3 h-3 mr-1" /> Sửa</Button>
                        <Button size="sm" variant="destructive" onClick={() => removeLead(l)}><Trash2 className="w-3 h-3" /></Button>
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
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{form.id ? `Sửa lead #${form.id}` : 'Tạo lead mới'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Họ tên *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><Label>Số điện thoại *</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nguồn</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.source}
                  onChange={(e) => set('source', e.target.value)}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Stage</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.stage}
                  onChange={(e) => set('stage', e.target.value)}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Giá trị ước (VND)</Label><Input type="number" value={form.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} /></div>
              <div>
                <Label>CTV phụ trách *</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={form.assignedCtvId}
                  onChange={(e) => set('assignedCtvId', e.target.value)}>
                  <option value="">— chọn CTV —</option>
                  {ctvs.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.rank || '?'})</option>)}
                </select>
              </div>
            </div>
            <div><Label>Ghi chú</Label>
              <textarea className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button disabled={submitting} onClick={save}>{submitting ? 'Đang lưu…' : form.id ? 'Cập nhật' : 'Tạo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
