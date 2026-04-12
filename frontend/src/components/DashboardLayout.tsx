'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayout({ role, children }: { role: string; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; rank?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== role) {
      router.push(`/${parsed.role}/dashboard`);
      return;
    }
    setUser(parsed);
  }, [role, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <Sidebar role={role} />
      <main className="ml-16 p-4 sm:p-6 lg:p-8 min-h-screen">
        {/* Header bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Xin chao,</p>
            <p className="text-lg font-semibold text-gray-800">{user.name} {user.rank ? `(${user.rank})` : ''}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
