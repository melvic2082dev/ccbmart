'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { api, formatVND, formatNumber } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts'
import {
  DollarSign, TrendingUp, Users, Store, AlertTriangle, CheckCircle, AlertCircle,
} from 'lucide-react'

interface ChartDataPoint {
  month: string
  ctv: number
  agency: number
  showroom: number
  grossProfit: number
  netProfit: number
}

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

interface CostBreakdown {
  [key: string]: number
}

interface AdminDashboardData {
  totalRevenue: number
  netProfit: number
  totalCtvs: number
  totalAgencies: number
  chartData: ChartDataPoint[]
  salaryFund: SalaryFund
  costBreakdown: CostBreakdown
}

const COST_LABEL_MAP: Record<string, string> = {
  cogs: 'Giá vốn hàng bán',
  commissions: 'Hoa hồng CTV',
  agencyDiscounts: 'Chiết khấu đại lý',
  fixedSalaries: 'Lương cứng quản lý',
  operationalCosts: 'Chi phí vận hành',
  otherCosts: 'Chi phí khác',
}

function getSalaryFundColor(pct: number) {
  if (pct >= 100) return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' }
  if (pct >= 80) return { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' }
  return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
}

function SalaryFundBadge({ pct }: { pct: number }) {
  if (pct >= 100) {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        VƯỢT NGƯỠNG 100%
      </Badge>
    )
  }
  if (pct >= 80) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        CẢNH BÁO 80%
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      OK
    </Badge>
  )
}

export default function AdminDashboardPage() {
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

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản trị</h1>
          <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">CCB Mart Admin</Badge>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-emerald-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Tổng doanh thu</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatVND(data.totalRevenue)}</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Lợi nhuận ròng</span>
                </div>
                <p className={`text-xl font-bold ${data.netProfit < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatVND(data.netProfit)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Tổng CTV</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatNumber(data.totalCtvs)}</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <Store className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Tổng đại lý</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatNumber(data.totalAgencies)}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {data && (
          <>
            {/* Revenue by channel - stacked bar chart */}
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Doanh thu theo kênh</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => formatVND(v)}
                      width={100}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => formatVND(Number(value))}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #d1fae5' }}
                    />
                    <Legend formatter={(value: string) => {
                        const m: Record<string, string> = { ctv: 'CTV', agency: 'Đại lý', showroom: 'Showroom' };
                        return m[value] ?? value;
                      }} />
                    <Bar dataKey="ctv" stackId="revenue" fill="#10b981" name="ctv" />
                    <Bar dataKey="agency" stackId="revenue" fill="#3b82f6" name="agency" />
                    <Bar dataKey="showroom" stackId="revenue" fill="#f59e0b" name="showroom" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profit chart - line chart */}
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Biểu đồ lợi nhuận</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => formatVND(v)}
                      width={100}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => formatVND(Number(value))}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #d1fae5' }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const m: Record<string, string> = { grossProfit: 'Lợi nhuận gộp', netProfit: 'Lợi nhuận ròng' };
                        return m[value] ?? value;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossProfit"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#10b981' }}
                      name="grossProfit"
                    />
                    <Line
                      type="monotone"
                      dataKey="netProfit"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#6366f1' }}
                      name="netProfit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Salary Fund Monitor */}
            {(() => {
              const sf = data.salaryFund
              const pct = Math.min(sf.usagePercent, 100)
              const colors = getSalaryFundColor(sf.usagePercent)
              return (
                <Card className={`shadow-sm border ${colors.bg}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-800">Giám sát Quỹ lương</CardTitle>
                      <SalaryFundBadge pct={sf.usagePercent} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-medium ${colors.text}`}>
                          Quỹ lương cứng: {formatVND(sf.totalFixedSalary)} / {formatVND(sf.salaryFundCap)}
                        </span>
                        <span className={`font-bold ${colors.text}`}>{sf.usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${colors.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {sf.managers && sf.managers.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Quản lý nhận lương cứng ({sf.managers.length} người)
                        </p>
                        <div className="space-y-1.5">
                          {sf.managers.map((mgr, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-gray-100 shadow-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800 text-sm">{mgr.name}</span>
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0">
                                  {mgr.rank}
                                </Badge>
                              </div>
                              <span className="text-sm font-semibold text-gray-700">
                                {formatVND(mgr.fixedSalary)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}

            {/* Cost breakdown */}
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Chi tiết chi phí</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-emerald-100">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Khoản chi phí</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Số tiền</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.costBreakdown).map(([key, value], idx) => {
                        const total = Object.values(data.costBreakdown).reduce((a, b) => a + b, 0)
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                        return (
                          <tr
                            key={key}
                            className={`border-b border-gray-50 hover:bg-emerald-50 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-gray-700">
                              {COST_LABEL_MAP[key] ?? key}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                              {formatVND(value)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-500">{pct}%</td>
                          </tr>
                        )
                      })}
                      <tr className="bg-emerald-50 font-semibold">
                        <td className="py-2.5 px-3 text-emerald-800">Tổng chi phí</td>
                        <td className="py-2.5 px-3 text-right text-emerald-800">
                          {formatVND(Object.values(data.costBreakdown).reduce((a, b) => a + b, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
