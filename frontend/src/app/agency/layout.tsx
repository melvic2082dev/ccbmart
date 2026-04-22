'use client';
import DashboardLayout from '@/components/DashboardLayout';

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="agency">{children}</DashboardLayout>;
}
