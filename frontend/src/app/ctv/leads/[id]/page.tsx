'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

interface Activity {
  id: number;
  type: string;
  outcome: string | null;
  durationMin: number | null;
  notes: string;
  occurredAt: string;
}

interface Lead {
  id: number;
  name: string;
  phone: string;
  zaloName: string | null;
  email: string | null;
  source: string;
  interestNote: string | null;
  estimatedValue: number | null;
  stage: string;
  nextActionAt: string | null;
  nextActionNote: string | null;
  lastContactedAt: string | null;
  closedAt: string | null;
  activities: Activity[];
}

const STAGE_TRANSITIONS: Record<string, string[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['NEGOTIATING', 'LOST'],
  NEGOTIATING: ['WON', 'LOST'],
  WON: [], LOST: [],
};

export default function CtvLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState({ type: 'CALL', outcome: '', durationMin: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.ctvLeadGet(id)
      .then((d) => setLead(d))
      .catch((e) => setError(e?.message || 'Không tải được'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (id) load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addActivity = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.ctvLeadAddActivity(id, {
        type: activity.type,
        outcome: activity.outcome || undefined,
        durationMin: activity.durationMin ? parseInt(activity.durationMin, 10) : undefined,
        notes: activity.notes,
      });
      setActivity({ type: 'CALL', outcome: '', durationMin: '', notes: '' });
      load();
    } catch (e) {
      setError((e as Error)?.message || 'Lỗi');
    } finally { setSubmitting(false); }
  };

  const changeStage = async (newStage: string) => {
    let lostReason: string | undefined;
    if (newStage === 'LOST') {
      lostReason = prompt('Lý do mất (price/competitor/timing/other):') || 'other';
    }
    try {
      await api.ctvLeadChangeStage(id, newStage, lostReason);
      load();
    } catch (e) {
      alert((e as Error)?.message);
    }
  };

  const convertWon = async () => {
    try {
      await api.ctvLeadConvert(id);
      alert('Đã chốt deal! Khách hàng đã được tạo. Tạo transaction từ trang sales.');
      load();
    } catch (e) { alert((e as Error)?.message); }
  };

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;
  if (!lead) return <div className="p-8 text-center">Không tìm thấy lead. {error}</div>;

  const transitions = STAGE_TRANSITIONS[lead.stage] || [];

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => router.push('/ctv/leads')}><ArrowLeft className="h-4 w-4 mr-2" />Quay lại</Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>{lead.name} · <span className="text-muted-foreground text-sm">{lead.phone}</span></span>
            <Badge>{lead.stage}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><strong>Nguồn:</strong> {lead.source}</div>
            <div><strong>Email:</strong> {lead.email || '—'}</div>
            <div><strong>Zalo:</strong> {lead.zaloName || '—'}</div>
            <div><strong>Est. value:</strong> {lead.estimatedValue ? new Intl.NumberFormat('vi-VN').format(Number(lead.estimatedValue)) + ' đ' : '—'}</div>
            <div className="col-span-2"><strong>Quan tâm:</strong> {lead.interestNote || '—'}</div>
            <div><strong>Last contact:</strong> {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleString('vi-VN') : '—'}</div>
            <div><strong>Next action:</strong> {lead.nextActionAt ? new Date(lead.nextActionAt).toLocaleString('vi-VN') : '—'}</div>
          </div>

          {transitions.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {transitions.map((s) => (
                <Button key={s} variant={s === 'LOST' ? 'destructive' : 'default'} size="sm" onClick={() => changeStage(s)}>
                  Chuyển → {s}
                </Button>
              ))}
              {lead.stage === 'NEGOTIATING' && (
                <Button size="sm" onClick={convertWon}>🎉 Chốt deal (tạo Customer)</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ghi log mới</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Loại</Label>
              <select className="w-full border rounded px-2 py-2" value={activity.type} onChange={(e) => setActivity({ ...activity, type: e.target.value })}>
                <option value="CALL">Gọi điện</option>
                <option value="ZALO">Zalo</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="MEET">Gặp mặt</option>
                <option value="NOTE">Ghi chú</option>
              </select>
            </div>
            <div>
              <Label>Kết quả</Label>
              <select className="w-full border rounded px-2 py-2" value={activity.outcome} onChange={(e) => setActivity({ ...activity, outcome: e.target.value })}>
                <option value="">—</option>
                <option value="ANSWERED">Trả lời</option>
                <option value="NO_ANSWER">Không bắt máy</option>
                <option value="BUSY">Bận</option>
                <option value="NOT_INTERESTED">Không quan tâm</option>
                <option value="WANT_INFO">Muốn biết thêm</option>
                <option value="PROMISED_BUY">Hứa mua</option>
              </select>
            </div>
            <div><Label>Phút</Label><Input type="number" value={activity.durationMin} onChange={(e) => setActivity({ ...activity, durationMin: e.target.value })} /></div>
          </div>
          <div>
            <Label>Ghi chú</Label>
            <textarea className="w-full border rounded px-2 py-2 min-h-[80px]" value={activity.notes} onChange={(e) => setActivity({ ...activity, notes: e.target.value })} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button onClick={addActivity} disabled={submitting || !activity.notes}>{submitting ? 'Đang lưu...' : 'Lưu log'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lịch sử ({lead.activities.length})</CardTitle></CardHeader>
        <CardContent>
          {lead.activities.length === 0 ? (
            <div className="text-muted-foreground text-sm">Chưa có hoạt động nào.</div>
          ) : (
            <div className="space-y-3">
              {lead.activities.map((a) => (
                <div key={a.id} className="border-l-2 border-muted pl-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{a.type}</Badge>
                    {a.outcome && <Badge>{a.outcome}</Badge>}
                    <span className="text-muted-foreground text-xs">{new Date(a.occurredAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="mt-1 text-sm">{a.notes}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
