'use client'

import { useEffect, useState } from 'react'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Product {
  id: string | number
  name: string
  price: number
  unit: string
  category: string
}

const CATEGORY_LABELS: Record<string, string> = {
  NS: 'Nông sản',
  TPCN: 'Thực phẩm chức năng',
  FMCG: 'Hàng tiêu dùng',
  GiaVi: 'Gia vị',
  CheBien: 'Chế biến',
  TienLoi: 'Tiện lợi',
}

const CATEGORY_ORDER = ['NS', 'TPCN', 'FMCG', 'GiaVi', 'CheBien', 'TienLoi']

export default function CtvProductsPage() {
  const [grouped, setGrouped] = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data: Product[] = await api.ctvProducts()
        const map: Record<string, Product[]> = {}
        for (const product of data || []) {
          const key = product.category || 'Other'
          if (!map[key]) map[key] = []
          map[key].push(product)
        }
        setGrouped(map)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const sortedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Danh sách sản phẩm</h1>

        {loading ? (
          <p className="text-muted-foreground text-sm">Đang tải...</p>
        ) : sortedCategories.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có sản phẩm nào</p>
        ) : (
          <div className="flex flex-col gap-6">
            {sortedCategories.map((cat) => (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {CATEGORY_LABELS[cat] ?? cat}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({grouped[cat].length} sản phẩm)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {grouped[cat].map((product, idx) => (
                      <li
                        key={product.id}
                        className={`px-4 py-3 flex items-center justify-between gap-3 ${idx % 2 === 0 ? 'bg-slate-50/40 dark:bg-slate-50/40' : ''}`}
                      >
                        <p className="font-medium min-w-0 truncate">{product.name}</p>
                        <p className="shrink-0 text-right tabular-nums">
                          <span className="font-semibold">{formatVND(product.price)}</span>
                          <span className="text-muted-foreground ml-1">/ {product.unit}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
