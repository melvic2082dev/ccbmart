'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Plus } from 'lucide-react';

const TITLE_LABELS: Record<string, string> = {
  EXPERT_LEADER: 'Chuyen gia Dan dat',
  SENIOR_EXPERT: 'Chuyen gia Cap cao',
  STRATEGIC_ADVISOR: 'Co van Chien luoc',
};

export default function AdminTitles() {
  const [titles, setTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('EXPERT_LEADER');
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchTitles = async () => {
    setLoading(true);
    try {
      const result = await api.adminTitles();
      setTitles(result || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTitles(); }, []);

  const handleAward = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await api.adminAwardTitle(parseInt(userId), selectedTitle);
      showToast('Da phong danh hieu');
      setShowForm(false);
      setUserId('');
      fetchTitles();
    } catch (e: any) { showToast('Loi: ' + e.message); }
    setSaving(false);
  };

  return (
    <>
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Award size={24} /> Danh hieu Chuyen gia</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> Phong danh hieu
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border border-gray-100 mb-6">
          <CardContent className="p-4">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <Input value={userId} onChange={e => setUserId(e.target.value)} placeholder="VD: 2" className="w-32" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh hieu</label>
                <select value={selectedTitle} onChange={e => setSelectedTitle(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="EXPERT_LEADER">Chuyen gia Dan dat</option>
                  <option value="SENIOR_EXPERT">Chuyen gia Cap cao</option>
                  <option value="STRATEGIC_ADVISOR">Co van Chien luoc</option>
                </select>
              </div>
              <Button onClick={handleAward} disabled={saving || !userId}>Phong</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Huy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-xl" />)}</div>
      ) : (
        <Card className="rounded-2xl border border-gray-100">
          <CardHeader>
            <CardTitle>Danh sach Danh hieu</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CTV</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Chuc danh</TableHead>
                  <TableHead>Danh hieu</TableHead>
                  <TableHead className="text-right">TV truc tiep</TableHead>
                  <TableHead>Ngay phong</TableHead>
                  <TableHead>Het han</TableHead>
                  <TableHead>Trang thai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.user?.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{t.user?.email}</TableCell>
                    <TableCell><Badge variant="outline">{t.user?.rank}</Badge></TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-700">{TITLE_LABELS[t.title] || t.title}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.directCount}</TableCell>
                    <TableCell>{new Date(t.awardedAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{new Date(t.expiresAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <Badge className={t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {t.isActive ? 'Hoat dong' : 'Het hieu luc'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {titles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">Chua co danh hieu nao</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
