'use client';
import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award } from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  GREEN: 'Green — Khởi đầu',
  BASIC: 'Basic',
  STANDARD: 'Standard',
  VIP_GOLD: 'VIP Gold',
};

const TIER_COLORS: Record<string, string> = {
  GREEN:    'bg-emerald-500 text-white border-emerald-600',
  BASIC:    'bg-slate-500 text-white border-slate-600',
  STANDARD: 'bg-blue-600 text-white border-blue-700',
  VIP_GOLD: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 border-amber-600 font-bold',
};

// Card border + accent bar per tier — gives the mobile card a distinct hue
const TIER_CARD: Record<string, { border: string; accent: string; bg: string }> = {
  GREEN:    { border: 'border-green-300',  accent: 'bg-green-500',  bg: 'bg-green-50/40' },
  BASIC:    { border: 'border-slate-300',  accent: 'bg-slate-500',  bg: 'bg-slate-50/40' },
  STANDARD: { border: 'border-blue-300',   accent: 'bg-blue-500',   bg: 'bg-blue-50/40' },
  VIP_GOLD: { border: 'border-amber-300',  accent: 'bg-amber-500',  bg: 'bg-amber-50/40' },
};

export default function AdminTiers() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.adminMembershipTiers().then(setTiers).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Award size={24} /> Hạng thẻ thành viên</h2>
      <p className="text-sm text-slate-500 mb-6">4 hạng: Green / Basic / Standard / VIP Gold · Cap referral 2.000.000đ/tháng</p>
      {loading ? <div className="h-48 bg-gray-200 animate-pulse rounded-xl" /> : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hạng</TableHead>
                    <TableHead className="text-right">Nạp tối thiểu</TableHead>
                    <TableHead className="text-right">Điểm tích (%)</TableHead>
                    <TableHead className="text-right">Giảm giá (%)</TableHead>
                    <TableHead className="text-right">Referral (%)</TableHead>
                    <TableHead className="text-right">Cap/tháng</TableHead>
                    <TableHead className="text-right">Số thành viên</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge className={TIER_COLORS[t.name] || 'bg-gray-100 text-gray-700'} variant="outline">
                          {TIER_LABELS[t.name] || t.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatVND(t.minDeposit)}</TableCell>
                      <TableCell className="text-right">{((t.pointsRate || 0) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{((t.discountPct || 0) * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{((t.referralPct || 0) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatVND(t.monthlyReferralCap || 0)}</TableCell>
                      <TableCell className="text-right font-semibold">{t._count?.wallets || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile compact card — colored accent per tier */}
          <div className="md:hidden space-y-2">
            {tiers.map(t => {
              const palette = TIER_CARD[t.name] || { border: 'border-gray-200', accent: 'bg-gray-400', bg: 'bg-white' };
              return (
                <div
                  key={t.id}
                  className={`rounded-lg border-2 ${palette.border} ${palette.bg} relative overflow-hidden p-3 pl-4 space-y-2`}
                >
                  <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${palette.accent}`} />
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={TIER_COLORS[t.name] || 'bg-gray-100 text-gray-700'} variant="outline">
                      {TIER_LABELS[t.name] || t.name}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-800">{t._count?.wallets || 0}</span> thành viên
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Nạp tối thiểu:</span>{' '}
                    <span className="font-semibold text-gray-800">{formatVND(t.minDeposit)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 text-center">
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 tracking-wide">Điểm tích</p>
                      <p className="text-sm font-semibold text-gray-800">{((t.pointsRate || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 tracking-wide">Giảm giá</p>
                      <p className="text-sm font-semibold text-gray-800">{((t.discountPct || 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 tracking-wide">Referral</p>
                      <p className="text-sm font-semibold text-gray-800">{((t.referralPct || 0) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 pt-1">
                    Cap referral/tháng: <span className="font-semibold text-gray-700">{formatVND(t.monthlyReferralCap || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
