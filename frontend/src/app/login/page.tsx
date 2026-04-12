'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const role: string = data.user?.role;
      if (role === 'ctv') router.push('/ctv/dashboard');
      else if (role === 'agency') router.push('/agency/dashboard');
      else if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'member') router.push('/member/dashboard');
      else setError('Vai tro khong hop le.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Dang nhap that bai.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">CCB Mart</h1>
          <p className="text-sm text-gray-500 mt-1">He thong quan ly noi bo</p>
        </div>

        <Card className="shadow-xl border border-gray-100 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-gray-800">Dang nhap</CardTitle>
            <CardDescription className="text-gray-500">
              Nhap thong tin tai khoan de tiep tuc
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                <Input id="email" type="email" placeholder="example@ccbmart.vn" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700 font-medium">Mat khau</Label>
                <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="rounded-xl" />
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary font-semibold py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Dang dang nhap...' : 'Dang nhap'}
              </button>
            </form>
            <p className="text-sm text-center text-gray-500 mt-4">
              Chua co tai khoan? <Link href="/register" className="text-blue-600 hover:underline font-medium">Dang ky thanh vien</Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} CCB Mart. All rights reserved.
        </p>
      </div>
    </div>
  );
}
