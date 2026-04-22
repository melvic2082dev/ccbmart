'use client';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="member">{children}</DashboardLayout>;
}
