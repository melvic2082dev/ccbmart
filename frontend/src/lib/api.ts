const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetchAPI(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => fetchAPI('/auth/me'),

  // CTV
  ctvDashboard: () => fetchAPI('/ctv/dashboard'),
  ctvTree: () => fetchAPI('/ctv/tree'),
  ctvCustomers: () => fetchAPI('/ctv/customers'),
  ctvTransactions: (page = 1) => fetchAPI(`/ctv/transactions?page=${page}`),
  ctvProducts: () => fetchAPI('/ctv/products'),

  // Agency
  agencyDashboard: () => fetchAPI('/agency/dashboard'),
  agencyInventory: () => fetchAPI('/agency/inventory'),
  agencyTransactions: (page = 1) => fetchAPI(`/agency/transactions?page=${page}`),

  // Admin
  adminDashboard: () => fetchAPI('/admin/dashboard'),
  adminCtvs: () => fetchAPI('/admin/ctvs'),
  adminCtvTree: () => fetchAPI('/admin/ctv-tree'),
  adminAgencies: () => fetchAPI('/admin/agencies'),
  adminCommissionConfig: () => fetchAPI('/admin/config/commission'),
  adminUpdateCommission: (tier: string, data: Record<string, number>) =>
    fetchAPI(`/admin/config/commission/${tier}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminReports: (months = 6) => fetchAPI(`/admin/reports/financial?months=${months}`),
  adminKpiLogs: () => fetchAPI('/admin/kpi-logs'),
  adminReassignCtv: (id: number, newParentId: number) =>
    fetchAPI(`/admin/ctv/${id}/reassign`, { method: 'POST', body: JSON.stringify({ newParentId }) }),
  adminChangeRank: (id: number, newRank: string, reason: string) =>
    fetchAPI(`/admin/ctv/${id}/rank`, { method: 'POST', body: JSON.stringify({ newRank, reason }) }),
  adminSync: () => fetchAPI('/admin/sync', { method: 'POST' }),
};

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}
