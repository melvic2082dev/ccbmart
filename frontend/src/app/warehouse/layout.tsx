'use client';
import DashboardLayout from '@/components/DashboardLayout';

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="warehouse_staff">{children}</DashboardLayout>;
}
