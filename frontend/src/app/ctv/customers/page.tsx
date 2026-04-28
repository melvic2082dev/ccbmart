'use client'

import { useEffect, useState } from 'react'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { ACCENT_CLASSES } from '@/lib/page-accent'

const ACCENT = ACCENT_CLASSES.sky

interface Customer {
  id: string | number
  name: string
  phone: string
  totalSpent: number
  firstPurchaseDate: string
}

export default function CtvCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.ctvCustomers()
        const sorted = [...(data || [])].sort(
          (a: Customer, b: Customer) => b.totalSpent - a.totalSpent
        )
        setCustomers(sorted)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={24} className={ACCENT.icon} /> Khách hàng của tôi
        </h1>
        <div className={`mt-2 w-12 h-1 ${ACCENT.bar} rounded-full`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Danh sách khách hàng ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground text-sm p-6">Đang tải...</p>
          ) : customers.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">Chưa có khách hàng nào</p>
          ) : (
            <ul className="divide-y">
              {customers.map((c, idx) => (
                <li
                  key={c.id}
                  className={`px-4 py-3 ${idx % 2 === 0 ? 'bg-slate-50/40 dark:bg-slate-50/40' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatVND(c.totalSpent)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Mua lần đầu:{' '}
                        {c.firstPurchaseDate
                          ? new Date(c.firstPurchaseDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
