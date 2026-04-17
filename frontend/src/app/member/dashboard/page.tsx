'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Award, Users, Copy } from 'lucide-react';

// V13.3: 4 hạng Green/Basic/Standard/VIP_GOLD (DB code) — label + màu riêng
const tierColors: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-700', Green: 'bg-green-100 text-green-700',
  BASIC: 'bg-slate-100 text-slate-700', Basic: 'bg-slate-100 text-slate-700',
  STANDARD: 'bg-blue-100 text-blue-700', Standard: 'bg-blue-100 text-blue-700',
  VIP_GOLD: 'bg-amber-100 text-amber-700', 'VIP Gold': 'bg-amber-100 text-amber-700',
};
const tierLabels: Record<string, string> = { GREEN: 'Green', BASIC: 'Basic', STANDARD: 'Standard', VIP_GOLD: 'VIP Gold' };

export default function MemberDashboard() {
  const [wallet, setWallet] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([api.memberWallet(), api.memberReferralStats()])
      .then(([w, s]) => { setWallet(w); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(wallet?.referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl" />)}</div></>;

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Wallet size={24} /> Vi thanh vien</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="gradient-border floating-card">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500">So du vi</p>
            <p className="text-3xl font-bold text-blue-600">{formatVND(wallet?.balance || 0)}</p>
            <Badge className={tierColors[wallet?.tier?.name] || 'bg-gray-100'}>{tierLabels[wallet?.tier?.name] || wallet?.tier?.name}</Badge>
          </CardContent>
        </Card>
        <Card className="floating-card">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500">Tong da nap</p>
            <p className="text-2xl font-bold">{formatVND(wallet?.totalDeposit || 0)}</p>
            <p className="text-xs text-gray-400">Giam gia: {((wallet?.tier?.discountPct || 0) * 100).toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card className="floating-card">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500">Nguoi gioi thieu</p>
            <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
            <p className="text-xs text-gray-400">Hoa hong: {formatVND(stats?.totalEarned || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral code */}
      <Card className="mb-6 glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Award size={20} /> Ma gioi thieu cua ban</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="text-2xl font-mono font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">{wallet?.referralCode}</code>
            <button onClick={copyCode} className="text-gray-400 hover:text-blue-600 transition-colors">
              <Copy size={20} />
            </button>
            {copied && <span className="text-sm text-green-600">Da copy!</span>}
          </div>
          <p className="text-sm text-gray-500 mt-2">Chia se ma nay cho ban be de nhan hoa hong {((wallet?.tier?.referralPct || 0) * 100).toFixed(0)}% moi lan ho nap tien.</p>
        </CardContent>
      </Card>

      {/* Referral earnings this month */}
      {stats && wallet?.tier?.referralPct > 0 && (
        <Card>
          <CardHeader><CardTitle>Hoa hong thang nay</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Da nhan: {formatVND(stats.earnedThisMonth)}</span>
              <span className="text-sm text-gray-500">Han muc: {formatVND(stats.monthlyReferralCap)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.earnedThisMonth / stats.monthlyReferralCap) * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Con lai: {formatVND(stats.capRemaining)}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
