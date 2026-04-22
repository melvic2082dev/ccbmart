'use client';
import DashboardLayout from '@/components/DashboardLayout';

export default function CtvLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="ctv">{children}</DashboardLayout>;
}
