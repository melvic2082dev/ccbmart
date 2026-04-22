'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'

interface SalaryFundManager {
  name: string
  rank: string
  fixedSalary: number
}

interface SalaryFund {
  totalFixedSalary: number
  salaryFundCap: number
  usagePercent: number
  managers: SalaryFundManager[]
}

interface AdminDashboardData {
  salaryFund: SalaryFund
}

const RANK_LABEL: Record<string, string> = {
  GDKD: 'GĐKD',
  GDV: 'GĐV',
  TP: 'TP',
  PP: 'PP',
}

const RANK_ORDER: Record<string, number> = { GDKD: 0, GDV: 1, TP: 2, PP: 3 }

function managerStatus(pct: number) {
  if (pct >= 100) {
    return {
      label: 'Vượt ngưỡng',
      badge: 'bg-red-100 text-red-700 border border-red-300',
      icon: <AlertCircle className="w-3 h-3" />,
    }
  }
  if (pct >= 80) {
    return {
      label: 'Cảnh báo',
      badge: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      icon: <AlertTriangle className="w-3 h-3" />,
    }
  }
  return {
    label: 'An toàn',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    icon: <CheckCircle className="w-3 h-3" />,
  }
}

export default function SalaryReportPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await api.adminDashboard()
        setData(result)
      } catch (err) {
        console.error('Failed to fetch admin dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const sortedManagers = useMemo(() => {
    if (!data?.salaryFund?.managers) return []
    return [...data.salaryFund.managers].sort((a, b) => {
      const ra = RANK_ORDER[a.rank] ?? 99
      const rb = RANK_ORDER[b.rank] ?? 99
      if (ra !== rb) return ra - rb
      return b.fixedSalary - a.fixedSalary
    })
  }, [data])

  const sf = data?.salaryFund
  const overallPct = sf?.usagePercent ?? 0

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Báo cáo lương cứng</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Danh sách quản lý nhận lương cứng và trạng thái quỹ lương theo ngưỡng 5% doanh thu kênh CTV.
            </p>
          </div>
        </div>

        {loading ? (
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ) : sf ? (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-emerald-100 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Ngưỡng quỹ lương</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatVND(sf.salaryFundCap)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">5% doanh thu kênh CTV</p>
                </CardContent>
              </Card>
              <Card className="border-emerald-100 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Thực tế đã chi</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatVND(sf.totalFixedSalary)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sortedManagers.length} người</p>
                </CardContent>
              </Card>
              <Card className="border-emerald-100 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">% ngưỡng</p>
                  <p className={`text-lg font-bold mt-1 ${overallPct >= 100 ? 'text-red-600' : overallPct >= 80 ? 'text-yellow-700' : 'text-emerald-700'}`}>
                    {overallPct.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={`h-2 rounded-full ${overallPct >= 100 ? 'bg-red-500' : overallPct >= 80 ? 'bg-yellow-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(overallPct, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Danh sách quản lý nhận lương cứng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-emerald-100">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">#</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Tên</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Cấp bậc</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Lương cứng</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">% ngưỡng</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedManagers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            Chưa có quản lý nào nhận lương cứng trong kỳ này.
                          </td>
                        </tr>
                      ) : (
                        sortedManagers.map((m, idx) => {
                          const pct = sf.salaryFundCap > 0 ? (m.fixedSalary / sf.salaryFundCap) * 100 : 0
                          const status = managerStatus(overallPct)
                          return (
                            <tr
                              key={idx}
                              className={`border-b border-gray-50 hover:bg-emerald-50 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-medium text-gray-800">{m.name}</td>
                              <td className="py-2.5 px-3">
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0">
                                  {RANK_LABEL[m.rank] ?? m.rank}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                                {formatVND(m.fixedSalary)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-700">{pct.toFixed(1)}%</td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge className={`${status.badge} inline-flex items-center gap-1`}>
                                  {status.icon}
                                  {status.label}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })
                      )}
                      {sortedManagers.length > 0 && (
                        <tr className="bg-emerald-50 font-semibold">
                          <td className="py-2.5 px-3 text-emerald-800" colSpan={3}>
                            Tổng cộng ({sortedManagers.length} người)
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800">
                            {formatVND(sf.totalFixedSalary)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700">
                            {overallPct.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3" />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">Không có dữ liệu.</CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
