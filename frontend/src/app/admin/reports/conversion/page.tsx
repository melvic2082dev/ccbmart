'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp } from 'lucide-react';

interface ConvRow {
  ctvId: number;
  name: string;
  rank: string | null;
  won: number;
  lost: number;
  conversionRate: number;
}

export default function ConversionReportPage() {
  const [items, setItems] = useState<ConvRow[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (month) params.month = month;
    api.adminLeadsConversionReport(params)
      .then((res) => setItems(res.items || []))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp /> Conversion report</h1>

      <div className="flex gap-2 items-center">
        <label className="text-sm">Tháng:</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-2 py-1" />
        <button onClick={() => setMonth('')} className="text-sm text-blue-600">tất cả thời gian</button>
      </div>

      <Card>
        <CardHeader><CardTitle>WON / (WON + LOST) per CTV</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Chưa có lead closed nào trong khoảng này</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CTV</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>WON</TableHead>
                  <TableHead>LOST</TableHead>
                  <TableHead>Conversion %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.ctvId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.rank || '—'}</TableCell>
                    <TableCell className="text-green-600">{r.won}</TableCell>
                    <TableCell className="text-red-600">{r.lost}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${r.conversionRate >= 50 ? 'text-green-600' : r.conversionRate >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                        {r.conversionRate}%
                      </span>
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
