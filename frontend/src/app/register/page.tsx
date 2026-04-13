'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', depositAmount: 0, referralCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.memberRegister({ ...form, depositAmount: form.depositAmount || 0, referralCode: form.referralCode || undefined });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const tiers = [
    { name: 'Green', min: 0, discount: '0%' },
    { name: 'Basic', min: 200000, discount: '3%' },
    { name: 'Standard', min: 500000, discount: '7%' },
    { name: 'VIP Gold', min: 2000000, discount: '12%' },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#10003;</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Dang ky thanh cong!</h2>
            <p className="text-gray-500 mb-6">Tai khoan cua ban da duoc tao. Hay dang nhap de bat dau.</p>
            <Button onClick={() => router.push('/login')} className="w-full">Dang nhap</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-blue-700">CCB Mart</h1>
          <p className="text-sm text-blue-500 mt-1">Dang ky thanh vien</p>
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Tao tai khoan</CardTitle>
            <CardDescription>Nhap thong tin de dang ky thanh vien</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Ho ten *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><Label>So dien thoai *</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></div>
              <div><Label>Mat khau *</Label><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} /></div>
              <div>
                <Label>So tien nap ban dau (VND)</Label>
                <Input type="number" value={form.depositAmount} onChange={e => setForm({...form, depositAmount: parseInt(e.target.value) || 0})} min={0} step={100000} />
                <div className="flex gap-1 mt-1 flex-wrap">
                  {tiers.map(t => (
                    <span key={t.name} className={`text-xs px-2 py-0.5 rounded ${form.depositAmount >= t.min ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {t.name}: {formatVND(t.min)}+ = {t.discount} giam
                    </span>
                  ))}
                </div>
              </div>
              <div><Label>Ma gioi thieu (tuy chon)</Label><Input value={form.referralCode} onChange={e => setForm({...form, referralCode: e.target.value.toUpperCase()})} placeholder="CCB_XXXXXX" /></div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Dang xu ly...' : 'Dang ky'}</Button>
            </form>
            <p className="text-sm text-center text-gray-500 mt-4">
              Da co tai khoan? <Link href="/login" className="text-blue-600 hover:underline">Dang nhap</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
