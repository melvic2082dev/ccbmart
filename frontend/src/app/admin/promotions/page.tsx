'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, Check, Clock, History } from 'lucide-react';

type Tab = 'pending' | 'history';

export default function AdminPromotions() {
  const [tab, setTab] = useState<Tab>('pending');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.adminPromotionsPending();
      setData(result);
    } catch (e: any) { showToast('Loi: ' + e.message); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.adminApprovePromotion(id);
      showToast('Da duyet bo nhiem');
      fetchData();
    } catch (e: any) { showToast('Loi: ' + e.message); }
  };

  const handleActivate = async () => {
    try {
      const result = await api.adminActivatePromotions();
      showToast(`Da kich hoat ${result.activated} bo nhiem`);
      fetchData();
    } catch (e: any) { showToast('Loi: ' + e.message); }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    ACTIVATED: 'bg-green-100 text-green-700',
  };

  return (
    <>
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Scale size={24} /> Bo nhiem T+1</h2>
        <Button onClick={handleActivate} className="bg-emerald-600 hover:bg-emerald-700">
          <Check size={16} className="mr-1" /> Kich hoat bo nhiem
        </Button>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          <button onClick={() => setTab('pending')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${tab === 'pending' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            <Clock size={16} /> Cho duyet {data?.pending?.length ? `(${data.pending.length})` : ''}
          </button>
          <button onClick={() => setTab('history')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${tab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            <History size={16} /> Lich su
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-xl" />)}</div>
      ) : (
        <Card className="rounded-2xl border border-gray-100">
          <CardHeader>
            <CardTitle>{tab === 'pending' ? 'CTV du dieu kien bo nhiem' : 'Lich su bo nhiem'}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CTV</TableHead>
                  <TableHead>Rank hien tai</TableHead>
                  <TableHead>Bo nhiem len</TableHead>
                  <TableHead>Thang dat</TableHead>
                  <TableHead>Hieu luc</TableHead>
                  <TableHead>Trang thai</TableHead>
                  {tab === 'pending' && <TableHead className="text-center">Hanh dong</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tab === 'pending' ? data?.pending : data?.history)?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.ctv?.name || `CTV #${p.ctvId}`}</TableCell>
                    <TableCell><Badge variant="outline">{p.ctv?.rank}</Badge></TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-700">{p.targetRank}</Badge></TableCell>
                    <TableCell>{p.qualifiedMonth}</TableCell>
                    <TableCell>{new Date(p.effectiveDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[p.status] || ''}>{p.status}</Badge></TableCell>
                    {tab === 'pending' && (
                      <TableCell className="text-center">
                        {p.status === 'PENDING' && (
                          <Button size="sm" onClick={() => handleApprove(p.id)} className="bg-blue-600 hover:bg-blue-700">
                            <Check size={14} className="mr-1" /> Duyet
                          </Button>
                        )}
                        {p.status === 'APPROVED' && <span className="text-sm text-blue-600">Da duyet, cho kich hoat</span>}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {((tab === 'pending' ? data?.pending : data?.history)?.length || 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">Khong co du lieu</TableCell>
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
