'use client'

import { useEffect, useState } from 'react'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ACCENT_CLASSES } from '@/lib/page-accent'
import { Package, Wheat, Pill, ShoppingBag, Soup, ChefHat, Sparkles, type LucideIcon } from 'lucide-react'

interface Product {
  id: string | number
  name: string
  price: number
  unit: string
  category: string
}

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  NS:      { label: 'Nông sản',             icon: Wheat,       tone: 'text-lime-600 dark:text-lime-400'      },
  TPCN:    { label: 'Thực phẩm chức năng', icon: Pill,         tone: 'text-rose-600 dark:text-rose-400'      },
  FMCG:    { label: 'Hàng tiêu dùng',       icon: ShoppingBag, tone: 'text-sky-600 dark:text-sky-400'        },
  GiaVi:   { label: 'Gia vị',               icon: Soup,        tone: 'text-orange-600 dark:text-orange-400'  },
  CheBien: { label: 'Chế biến',             icon: ChefHat,     tone: 'text-amber-600 dark:text-amber-400'    },
  TienLoi: { label: 'Tiện lợi',             icon: Sparkles,    tone: 'text-fuchsia-600 dark:text-fuchsia-400'},
}

const CATEGORY_ORDER = ['NS', 'TPCN', 'FMCG', 'GiaVi', 'CheBien', 'TienLoi']
const FALLBACK = { label: '', icon: Package, tone: 'text-muted-foreground' }
const ACCENT = ACCENT_CLASSES.violet

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package size={24} className={ACCENT.icon} /> Danh sách sản phẩm
          </h1>
          <div className={`mt-2 w-12 h-1 ${ACCENT.bar} rounded-full`} />
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Đang tải...</p>
        ) : sortedCategories.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có sản phẩm nào</p>
        ) : (
          <div className="flex flex-col gap-6">
            {sortedCategories.map((cat) => {
              const meta = CATEGORY_META[cat] ?? { ...FALLBACK, label: cat }
              const Icon = meta.icon
              return (
                <Card key={cat}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Icon size={20} className={meta.tone} />
                      <span>{meta.label}</span>
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
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
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
