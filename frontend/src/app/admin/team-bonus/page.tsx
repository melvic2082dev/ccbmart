'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, RefreshCw } from 'lucide-react';

export default function AdminTeamBonus() {
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [toast, setToast] = useState('');

  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchBonuses = async () => {
    setLoading(true);
    try {
      const result = await api.adminTeamBonus(month);
      setBonuses(result || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchBonuses(); }, [month]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const result = await api.adminCalculateTeamBonus(month);
      showToast(`Da tinh ${result.totalBonuses} thuong dan dat, tong: ${formatVND(result.totalAmount)}`);
      fetchBonuses();
    } catch (e: any) { showToast('Loi: ' + e.message); }
    setCalculating(false);
  };

  // Generate month options (last 6 months)
  const monthOptions = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <>
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Gift size={24} /> Thuong dan dat doi nhom</h2>
        <div className="flex items-center gap-3">
          <select value={month} onChange={e => setMonth(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <Button onClick={handleCalculate} disabled={calculating}>
            <RefreshCw size={16} className={`mr-1 ${calculating ? 'animate-spin' : ''}`} /> Tinh thuong
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-xl" />)}</div>
      ) : (
        <Card className="rounded-2xl border border-gray-100">
          <CardHeader>
            <CardTitle>Thuong dan dat thang {month}</CardTitle>
            <p className="text-sm text-gray-500">Nguon: 2% Marketing | Tier: 5-9 (0.5%), 10-19 (1%), 20-49 (1.5%), 50+ (2%)</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CTV</TableHead>
                  <TableHead>Chuc danh</TableHead>
                  <TableHead className="text-right">TV truc tiep</TableHead>
                  <TableHead className="text-right">DT doi nhom</TableHead>
                  <TableHead className="text-right">Ti le</TableHead>
                  <TableHead className="text-right">Tong thuong</TableHead>
                  <TableHead className="text-right">Tien mat</TableHead>
                  <TableHead className="text-right">Diem</TableHead>
                  <TableHead>Trang thai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonuses.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.ctv?.name || `CTV #${b.ctvId}`}</TableCell>
                    <TableCell><Badge variant="outline">{b.ctv?.rank}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{b.directMemberCount}</TableCell>
                    <TableCell className="text-right font-mono">{formatVND(b.teamRevenue)}</TableCell>
                    <TableCell className="text-right font-mono">{(b.bonusRate * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(b.bonusAmount)}</TableCell>
                    <TableCell className="text-right font-mono">{b.cashAmount > 0 ? formatVND(b.cashAmount) : '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatVND(b.pointAmount)}</TableCell>
                    <TableCell>
                      <Badge className={b.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {b.status === 'PAID' ? 'Da tra' : 'Cho xu ly'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {bonuses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">Chua co du lieu. Bam "Tinh thuong" de bat dau.</TableCell>
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
