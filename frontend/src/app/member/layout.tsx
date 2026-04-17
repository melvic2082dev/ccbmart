'use client';
import DashboardLayout from '@/components/DashboardLayout';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="member">{children}</DashboardLayout>;
}
