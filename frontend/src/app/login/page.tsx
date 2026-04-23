'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      localStorage.setItem('user', JSON.stringify(data.user));
      const role: string = data.user?.role;
      if (role === 'ctv') router.push('/ctv/dashboard');
      else if (role === 'agency') router.push('/agency/dashboard');
      else if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'member') router.push('/member/dashboard');
      else setError('Vai trò không hợp lệ.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">CCB Mart</h1>
          <p className="text-sm text-gray-400 mt-1">Hệ thống quản lý chuỗi bán lẻ cộng đồng</p>
        </div>

        <Card className="shadow-2xl border border-gray-800 rounded-2xl" style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-white">Đăng nhập</CardTitle>
            <CardDescription className="text-gray-400">Nhập thông tin tài khoản để tiếp tục</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-300 font-medium">Email</Label>
                <Input id="email" type="email" placeholder="example@ccbmart.vn" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-300 font-medium">Mật khẩu</Label>
                <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 focus:ring-blue-500" />
              </div>
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
            <p className="text-sm text-center text-gray-500 mt-4">
              Chưa có tài khoản? <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">Đăng ký thành viên</Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600 mt-6">
          &copy; {new Date().getFullYear()} CCB Mart. All rights reserved.
        </p>
      </div>
    </div>
  );
}
