'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, DollarSign, Gift, Award } from 'lucide-react'

export default function AgencyDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.agencyDashboard()
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

  const warningBadgeVariant = (type: string) => {
    if (type === 'expired') return 'destructive'
    if (type === 'low_stock') return 'destructive'
    if (type === 'expiring_soon') return 'warning'
    return 'secondary'
  }

  const warningLabel = (type: string) => {
    if (type === 'expired') return 'Hết hạn'
    if (type === 'low_stock') return 'Sắp hết hàng'
    if (type === 'expiring_soon') return 'Sắp hết hạn'
    return type
  }

  return (
    <DashboardLayout role="agency">
      <div className="space-y-6">
        {/* Agency Info */}
        <div>
          <h1 className="text-2xl font-bold">{data?.agency?.name}</h1>
          <p className="text-muted-foreground">{data?.agency?.address}</p>
          <Badge variant="outline" className="mt-1">
            Hạng ký quỹ: {data?.agency?.depositTier}
          </Badge>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Doanh thu tháng</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatVND(data?.stats?.monthlyRevenue ?? 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tăng trưởng</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {data?.stats?.growth !== undefined
                  ? `${data.stats.growth > 0 ? '+' : ''}${data.stats.growth}%`
                  : '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hoa hồng ước tính</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatVND(data?.stats?.estimatedCommission ?? 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Điểm thưởng</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data?.stats?.bonusPoints ?? 0}</p>
              <p className="text-xs text-muted-foreground">Tối đa 5% DT</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => formatVND(v)} width={100} />
                <Tooltip formatter={(value: any) => formatVND(Number(value))} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Warnings */}
        <Card>
          <CardHeader>
            <CardTitle>Cảnh báo tồn kho</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.warnings?.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có cảnh báo.</p>
            ) : (
              <div className="space-y-2">
                {data?.warnings?.map((w: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{w.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        SL: {w.quantity} &mdash; HSD:{' '}
                        {w.expiryDate
                          ? new Date(w.expiryDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        w.type === 'expiring_soon'
                          ? 'outline'
                          : 'destructive'
                      }
                      className={
                        w.type === 'expiring_soon'
                          ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                          : ''
                      }
                    >
                      {warningLabel(w.type)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Config */}
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình hoa hồng</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhóm</TableHead>
                  <TableHead>Tỷ lệ hoa hồng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.commissionConfig?.map((cfg: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">Nhóm {cfg.group}</TableCell>
                    <TableCell>{cfg.rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
