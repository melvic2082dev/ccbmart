'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const diff = new Date(expiryDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function warningRowClass(type: string, expiryDate: string | null): string {
  if (type === 'expired') return 'bg-red-50'
  if (type === 'expiring_soon') {
    const days = getDaysUntilExpiry(expiryDate)
    if (days !== null && days < 7) return 'bg-yellow-50'
    return 'bg-yellow-50'
  }
  if (type === 'low_stock') return 'bg-red-50'
  return ''
}

function warningLabel(type: string): string {
  if (type === 'expired') return 'Hết hạn'
  if (type === 'expiring_soon') return 'Sắp hết hạn'
  if (type === 'low_stock') return 'Sắp hết hàng'
  return type
}

function warningBadgeClass(type: string, expiryDate: string | null): string {
  if (type === 'expired') return 'bg-red-100 text-red-800 border-red-300'
  if (type === 'low_stock') return 'bg-red-100 text-red-800 border-red-300'
  if (type === 'expiring_soon') {
    const days = getDaysUntilExpiry(expiryDate)
    if (days !== null && days < 7) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }
  return ''
}

export default function AgencyInventoryPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.agencyInventory()
      .then((res: any) => setData(res))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardLayout role="agency">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="agency">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quản lý tồn kho</h1>

        {/* Inventory Warnings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cảnh báo tồn kho</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.warnings?.length ? (
              <p className="text-muted-foreground text-sm">Không có cảnh báo tồn kho.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Hạn sử dụng</TableHead>
                    <TableHead>Loại cảnh báo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.warnings.map((w: any, idx: number) => (
                    <TableRow key={idx} className={warningRowClass(w.type, w.expiryDate)}>
                      <TableCell className="font-medium">{w.productName}</TableCell>
                      <TableCell>{w.quantity}</TableCell>
                      <TableCell>
                        {w.expiryDate
                          ? new Date(w.expiryDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={warningBadgeClass(w.type, w.expiryDate)}
                        >
                          {warningLabel(w.type)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Product List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.products?.length ? (
              <p className="text-muted-foreground text-sm">Không có sản phẩm.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Tồn kho</TableHead>
                    <TableHead>Giá nhập</TableHead>
                    <TableHead>Hạn sử dụng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((p: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.sku ?? '—'}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{p.importPrice !== undefined ? formatVND(p.importPrice) : '—'}</TableCell>
                      <TableCell>
                        {p.expiryDate
                          ? new Date(p.expiryDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
