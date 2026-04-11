'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Product {
  id: string | number
  name: string
  price: number
  unit: string
  cogsPercent: number
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

function cogsBadgeVariant(pct: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (pct >= 80) return 'destructive'
  if (pct >= 60) return 'default'
  return 'secondary'
}

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
    <DashboardLayout role="ctv">
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
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead>Giá bán</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead>COGS%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped[cat].map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{formatVND(product.price)}</TableCell>
                          <TableCell>{product.unit}</TableCell>
                          <TableCell>
                            <Badge variant={cogsBadgeVariant(product.cogsPercent)}>
                              {product.cogsPercent != null
                                ? `${product.cogsPercent.toFixed(1)}%`
                                : '—'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
