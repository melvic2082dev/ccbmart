'use client';
import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Share2 } from 'lucide-react';

export default function MemberReferral() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMsg, setRedeemMsg] = useState('');

  useEffect(() => {
    api.memberReferralStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(stats?.referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = async () => {
    if (!redeemCode) return;
    try {
      const res = await api.memberRedeemCode(redeemCode);
      setRedeemMsg(`Thanh cong! Nguoi gioi thieu: ${res.referrerName}`);
      setRedeemCode('');
    } catch (err: any) { setRedeemMsg(err.message); }
  };

  if (loading) return <><div className="h-48 bg-gray-200 animate-pulse rounded-xl" /></>;

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Users size={24} /> Gioi thieu ban be</h2>

      {/* My referral code */}
      <Card className="mb-6 gradient-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Ma gioi thieu cua ban</p>
              <code className="text-3xl font-mono font-bold text-blue-600">{stats?.referralCode}</code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyCode}>
                <Copy size={14} className="mr-1" />{copied ? 'Da copy!' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigator.share?.({ text: `Dang ky CCB Mart voi ma ${stats?.referralCode}` }).catch(() => {})}>
                <Share2 size={14} className="mr-1" />Chia se
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3">Hoa hong: {((stats?.referralPct || 0) * 100).toFixed(0)}% moi lan ban be nap tien</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="floating-card"><CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-500">Tong nguoi gioi thieu</p>
          <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
        </CardContent></Card>
        <Card className="floating-card"><CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-500">Tong hoa hong</p>
          <p className="text-2xl font-bold text-green-600">{formatVND(stats?.totalEarned || 0)}</p>
        </CardContent></Card>
        <Card className="floating-card"><CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-500">Con lai thang nay</p>
          <p className="text-2xl font-bold">{formatVND(stats?.capRemaining || 0)}</p>
        </CardContent></Card>
      </div>

      {/* Referral list */}
      {stats?.referrals?.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Danh sach ban be</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.referrals.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-gray-400">{new Date(r.joinedAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <Badge variant="outline">{r.tier}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redeem code */}
      <Card>
        <CardHeader><CardTitle>Nhap ma gioi thieu</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">Neu ban duoc gioi thieu boi ai do, nhap ma cua ho o day.</p>
          <div className="flex gap-2">
            <Input value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} placeholder="CCB_XXXXXX" />
            <Button onClick={handleRedeem} disabled={!redeemCode}>Ap dung</Button>
          </div>
          {redeemMsg && <p className="text-sm mt-2 text-blue-600">{redeemMsg}</p>}
        </CardContent>
      </Card>
    </>
  );
}
