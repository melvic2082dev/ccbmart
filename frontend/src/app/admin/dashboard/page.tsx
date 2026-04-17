'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { api, formatVND, formatNumber } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import {
  DollarSign, TrendingUp, Users, Store, AlertTriangle, CheckCircle, AlertCircle,
  Target, Clock, ArrowRight,
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

interface ChannelRevenue {
  ctv: number
  agency: number
  showroom: number
}

interface AdminDashboardData {
  totalRevenue: number
  netProfit: number
  totalCtvs: number
  totalAgencies: number
  chartData: ChartDataPoint[]
  salaryFund: SalaryFund
  costBreakdown: CostBreakdown
  channelRevenue: ChannelRevenue
}

type Period = 'month' | 'quarter' | 'year'

const CHANNEL_LABEL: Record<keyof ChannelRevenue, string> = {
  ctv: 'CTV',
  agency: 'Cửa hàng đại lý',
  showroom: 'Showroom',
}

const COST_LABEL_MAP: Record<string, string> = {
  cogs: 'Giá vốn hàng bán',
  ctvCommissions: 'Hoa hồng CTV',
  agencyCommissions: 'Chiết khấu cửa hàng đại lý',
  xwiseFee: 'Phí Xwise (5%)',
  e29Fee: 'Phí E29 (1%)',
  logistics: 'Chi phí logistics',
  marketing: 'Chi phí marketing',
  opcoOverhead: 'Chi phí vận hành OpCo',
  fixedCosts: 'Chi phí cố định',
}

const RANK_LABEL: Record<string, string> = {
  GDKD: 'GĐKD',
  GDV: 'GĐV',
  TP: 'TP',
  PP: 'PP',
}

// COGS blended ratio across channels (50% of revenue)
const COGS_RATIO = 0.5

// TODO: replace with real API for revenue/profit targets
const BASE_REVENUE_TARGET = 600_000_000
const BASE_NET_PROFIT_TARGET = 30_000_000

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
      AN TOÀN
    </Badge>
  )
}

function formatTimestamp(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function periodMultiplier(p: Period) {
  if (p === 'quarter') return 3
  if (p === 'year') return 12
  return 1
}

function periodLabel(p: Period) {
  if (p === 'quarter') return 'Quý'
  if (p === 'year') return 'Năm'
  return 'Tháng'
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await api.adminDashboard()
        setData(result)
        setUpdatedAt(new Date())
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không tải được dữ liệu dashboard'
        console.error('Failed to fetch admin dashboard:', err)
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const mult = periodMultiplier(period)
  const revenueTarget = BASE_REVENUE_TARGET * mult
  const profitTarget = BASE_NET_PROFIT_TARGET * mult

  const channelRows = data
    ? (Object.keys(CHANNEL_LABEL) as (keyof ChannelRevenue)[]).map((k) => {
        const revenue = data.channelRevenue?.[k] ?? 0
        const cogs = revenue * COGS_RATIO
        const grossProfit = revenue - cogs
        const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
        return { key: k, label: CHANNEL_LABEL[k], revenue, cogs, grossProfit, margin }
      })
    : []

  const totalChannel = channelRows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cogs: acc.cogs + r.cogs,
      grossProfit: acc.grossProfit + r.grossProfit,
    }),
    { revenue: 0, cogs: 0, grossProfit: 0 }
  )
  const totalMargin = totalChannel.revenue > 0 ? (totalChannel.grossProfit / totalChannel.revenue) * 100 : 0

  // Group salary fund by rank
  const rankCounts: Record<string, number> = {}
  if (data?.salaryFund?.managers) {
    for (const m of data.salaryFund.managers) {
      rankCounts[m.rank] = (rankCounts[m.rank] || 0) + 1
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản trị</h1>
            {updatedAt && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Cập nhật lần cuối: {formatTimestamp(updatedAt)}
              </p>
            )}
          </div>
          <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">CCB Mart Admin</Badge>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
            <p className="font-semibold mb-1">Lỗi tải dữ liệu dashboard</p>
            <p>{error}</p>
            <p className="mt-1 text-xs text-red-600">
              Có thể backend (port 4000) chưa chạy, hoặc Prisma client chưa đồng bộ. Chạy
              <code className="mx-1 px-1 bg-red-100 rounded">cd backend && npx prisma generate && npx prisma db push</code>
              rồi khởi động lại backend.
            </p>
          </div>
        )}

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
                  <span className="text-xs font-medium uppercase tracking-wide">Tổng cửa hàng đại lý</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatNumber(data.totalAgencies)}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {data && (
          <>
            {/* Target cards */}
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-gray-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    Mục tiêu doanh thu & lợi nhuận
                  </CardTitle>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                    className="border border-emerald-200 rounded-md text-sm px-3 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="month">Tháng</option>
                    <option value="quarter">Quý</option>
                    <option value="year">Năm</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {(() => {
                    const pctRev = revenueTarget > 0 ? (data.totalRevenue / revenueTarget) * 100 : 0
                    const pctProfit = profitTarget > 0 ? (data.netProfit / profitTarget) * 100 : 0
                    return (
                      <>
                        <div className="p-4 rounded-lg border border-emerald-100 bg-emerald-50/40">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Mục tiêu doanh thu ({periodLabel(period)})</p>
                              <p className="text-lg font-bold text-gray-900 mt-0.5">{formatVND(revenueTarget)}</p>
                            </div>
                            <span className={`text-sm font-bold ${pctRev >= 100 ? 'text-emerald-700' : pctRev >= 80 ? 'text-yellow-700' : 'text-gray-700'}`}>
                              {pctRev.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            Thực tế: <span className="font-semibold text-gray-900">{formatVND(data.totalRevenue)}</span>
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${pctRev >= 100 ? 'bg-emerald-500' : pctRev >= 80 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(Math.max(pctRev, 0), 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-lg border border-emerald-100 bg-emerald-50/40">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Mục tiêu lợi nhuận ròng ({periodLabel(period)})</p>
                              <p className="text-lg font-bold text-gray-900 mt-0.5">{formatVND(profitTarget)}</p>
                            </div>
                            <span className={`text-sm font-bold ${pctProfit >= 100 ? 'text-emerald-700' : pctProfit >= 80 ? 'text-yellow-700' : data.netProfit < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                              {pctProfit.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            Thực tế: <span className={`font-semibold ${data.netProfit < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatVND(data.netProfit)}</span>
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${data.netProfit < 0 ? 'bg-red-500' : pctProfit >= 100 ? 'bg-emerald-500' : pctProfit >= 80 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(Math.max(pctProfit, 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Revenue chart + Channel profit table */}
            <div className="grid lg:grid-cols-2 gap-6">
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
                        formatter={(value: any, name: any) => {
                          const m: Record<string, string> = { ctv: 'CTV', agency: 'Cửa hàng đại lý', showroom: 'Showroom' }
                          return [formatVND(Number(value)), m[String(name)] ?? String(name)]
                        }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #d1fae5' }}
                      />
                      <Legend formatter={(value: string) => {
                          const m: Record<string, string> = { ctv: 'CTV', agency: 'Cửa hàng đại lý', showroom: 'Showroom' }
                          return m[value] ?? value
                        }} />
                      <Bar dataKey="ctv" stackId="revenue" fill="#10b981" name="ctv" />
                      <Bar dataKey="agency" stackId="revenue" fill="#3b82f6" name="agency" />
                      <Bar dataKey="showroom" stackId="revenue" fill="#f59e0b" name="showroom" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-emerald-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-800">Lợi nhuận theo kênh (tháng hiện tại)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-emerald-100">
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Kênh</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600">Doanh thu</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600" title="Giá vốn hàng bán blended 50%">COGS (50%)</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600">LN gộp</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600">Biên LN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {channelRows.map((r, idx) => (
                          <tr
                            key={r.key}
                            className={`border-b border-gray-50 hover:bg-emerald-50 transition-colors ${
                              idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-gray-700 font-medium">{r.label}</td>
                            <td className="py-2.5 px-3 text-right text-gray-900">{formatVND(r.revenue)}</td>
                            <td className="py-2.5 px-3 text-right text-gray-500">{formatVND(r.cogs)}</td>
                            <td className={`py-2.5 px-3 text-right font-semibold ${r.grossProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                              {formatVND(r.grossProfit)}
                            </td>
                            <td className={`py-2.5 px-3 text-right ${r.grossProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                              {r.margin.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-50 font-semibold">
                          <td className="py-2.5 px-3 text-emerald-800">Tổng</td>
                          <td className="py-2.5 px-3 text-right text-emerald-800">{formatVND(totalChannel.revenue)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700">{formatVND(totalChannel.cogs)}</td>
                          <td className={`py-2.5 px-3 text-right ${totalChannel.grossProfit < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                            {formatVND(totalChannel.grossProfit)}
                          </td>
                          <td className={`py-2.5 px-3 text-right ${totalChannel.grossProfit < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                            {totalMargin.toFixed(1)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-3">
                      * COGS 50% blended — tỷ lệ giá vốn trung bình áp dụng chung cho tất cả kênh.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profit chart */}
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Biểu đồ lợi nhuận (LN gộp & LN ròng)</CardTitle>
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
                      formatter={(value: any, name: any) => {
                        const m: Record<string, string> = { grossProfit: 'Lợi nhuận gộp', netProfit: 'Lợi nhuận ròng' }
                        return [formatVND(Number(value)), m[String(name)] ?? String(name)]
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #d1fae5' }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const m: Record<string, string> = { grossProfit: 'Lợi nhuận gộp', netProfit: 'Lợi nhuận ròng' }
                        return m[value] ?? value
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossProfit"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#8b5cf6' }}
                      name="grossProfit"
                    />
                    <Line
                      type="monotone"
                      dataKey="netProfit"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#ef4444' }}
                      name="netProfit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Salary Fund Summary */}
            {(() => {
              const sf = data.salaryFund
              const pct = Math.min(sf.usagePercent, 100)
              const colors = getSalaryFundColor(sf.usagePercent)
              const rankOrder = ['GDKD', 'GDV', 'TP', 'PP']
              return (
                <Card className={`shadow-sm border ${colors.bg}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-gray-800">Quỹ lương cứng — Tóm tắt</CardTitle>
                      <SalaryFundBadge pct={sf.usagePercent} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Ngưỡng (5% doanh thu kênh CTV)</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatVND(sf.salaryFundCap)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Thực tế đã chi</p>
                        <p className={`text-lg font-bold mt-1 ${colors.text}`}>
                          {formatVND(sf.totalFixedSalary)}{' '}
                          <span className="text-sm font-semibold">({sf.usagePercent.toFixed(1)}%)</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${colors.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Phân bổ theo cấp ({sf.managers?.length ?? 0} người)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {rankOrder.map((rank) => {
                          const count = rankCounts[rank] ?? 0
                          if (count === 0) return null
                          return (
                            <Badge key={rank} className="bg-white dark:bg-slate-800 text-gray-700 border border-gray-200 px-2.5 py-1">
                              {RANK_LABEL[rank] ?? rank}: <span className="font-bold ml-1">{count}</span> người
                            </Badge>
                          )
                        })}
                        {(sf.managers?.length ?? 0) === 0 && (
                          <span className="text-sm text-gray-500">Chưa có quản lý nào nhận lương cứng.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Link
                        href="/admin/salary-report"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Xem chi tiết
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
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
                              idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50'
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
    </>
  )
}
