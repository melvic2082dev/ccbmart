'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api, formatVND, formatNumber } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import {
  DollarSign, TrendingUp, Users, Store, AlertTriangle, CheckCircle, AlertCircle,
  Target, Clock, ArrowRight, ArrowUp, ArrowDown, Percent, FileDown, Filter,
  BarChart3, Activity, ListChecks, Bell,
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
type ChannelKey = 'all' | 'ctv' | 'agency' | 'showroom'
type ChartTab = 'revenue' | 'profit'
type BottomTab = 'pnl' | 'alerts'

interface PnlRow {
  month: string
  revenue: number
  cogs: number
  ctvCommission: number
  agencyCommission: number
  fixedSalary: number
  opex: number
  grossProfit: number
  netProfit: number
  netMargin: number
  warning: 'ok' | 'warn' | 'danger'
}

interface AlertItem {
  severity: 'ok' | 'warn' | 'danger'
  title: string
  detail: string
  link?: string
}

const CHANNEL_LABEL: Record<Exclude<ChannelKey, 'all'>, string> = {
  ctv: 'CTV',
  agency: 'Cửa hàng đại lý',
  showroom: 'Showroom',
}

const BASE_REVENUE_TARGET = 600_000_000
const BASE_NET_PROFIT_TARGET = 30_000_000

const COGS_RATIO = 0.5
const CTV_COMMISSION_RATIO = 0.08
const AGENCY_COMMISSION_RATIO = 0.05
const OPEX_RATIO = 0.1

function formatTimestamp(d: Date) {
  return d.toLocaleString('vi-VN')
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

function DeltaBadge({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  if (!previous || previous === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const up = pct >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%{suffix}
    </span>
  )
}

function getSalaryFundColor(pct: number) {
  if (pct >= 100) return { bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400' }
  if (pct >= 80) return { bar: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-400' }
  return { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' }
}

function SalaryFundBadge({ pct }: { pct: number }) {
  if (pct >= 100) {
    return (
      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        VƯỢT NGƯỠNG 100%
      </Badge>
    )
  }
  if (pct >= 80) {
    return (
      <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        CẢNH BÁO 80%
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      AN TOÀN
    </Badge>
  )
}

function AlertBadge({ severity }: { severity: 'ok' | 'warn' | 'danger' }) {
  if (severity === 'danger') return <span className="text-red-500">🔴</span>
  if (severity === 'warn') return <span className="text-yellow-500">🟠</span>
  return <span className="text-emerald-500">🟢</span>
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<Period>('month')
  const [channel, setChannel] = useState<ChannelKey>('all')
  const [chartTab, setChartTab] = useState<ChartTab>('revenue')
  const [bottomTab, setBottomTab] = useState<BottomTab>('pnl')
  const [showExtraCols, setShowExtraCols] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const mult = periodMultiplier(period)
  const revenueTarget = BASE_REVENUE_TARGET * mult
  const profitTarget = BASE_NET_PROFIT_TARGET * mult

  // Filter chart data by channel
  const filteredChart = useMemo(() => {
    if (!data) return [] as ChartDataPoint[]
    return data.chartData.map((p) => {
      if (channel === 'all') return p
      const keep = channel as keyof ChannelRevenue
      const revenueOnly = p[keep]
      const ratio = (p.ctv + p.agency + p.showroom) > 0
        ? revenueOnly / (p.ctv + p.agency + p.showroom)
        : 0
      return {
        ...p,
        ctv: keep === 'ctv' ? p.ctv : 0,
        agency: keep === 'agency' ? p.agency : 0,
        showroom: keep === 'showroom' ? p.showroom : 0,
        grossProfit: p.grossProfit * ratio,
        netProfit: p.netProfit * ratio,
      }
    })
  }, [data, channel])

  // Build P&L rows from chart data
  const pnlRows: PnlRow[] = useMemo(() => {
    return filteredChart.map((p) => {
      const revenue = p.ctv + p.agency + p.showroom
      const cogs = revenue * COGS_RATIO
      const ctvCommission = p.ctv * CTV_COMMISSION_RATIO
      const agencyCommission = p.agency * AGENCY_COMMISSION_RATIO
      const opex = revenue * OPEX_RATIO
      const fixedSalary = Math.max(0, p.grossProfit - p.netProfit - ctvCommission - agencyCommission - opex)
      const netMargin = revenue > 0 ? (p.netProfit / revenue) * 100 : 0
      let warning: 'ok' | 'warn' | 'danger' = 'ok'
      if (netMargin < 0) warning = 'danger'
      else if (netMargin < 3) warning = 'warn'
      return {
        month: p.month,
        revenue,
        cogs,
        ctvCommission,
        agencyCommission,
        fixedSalary,
        opex,
        grossProfit: p.grossProfit,
        netProfit: p.netProfit,
        netMargin,
        warning,
      }
    })
  }, [filteredChart])

  // KPI calculations — use selectedMonth if any, else last month; compare vs prior month
  const activeRow = useMemo(() => {
    if (!pnlRows.length) return null
    if (selectedMonth) {
      const found = pnlRows.find((r) => r.month === selectedMonth)
      if (found) return found
    }
    return pnlRows[pnlRows.length - 1]
  }, [pnlRows, selectedMonth])

  const prevRow = useMemo(() => {
    if (!pnlRows.length || !activeRow) return null
    const idx = pnlRows.findIndex((r) => r.month === activeRow.month)
    return idx > 0 ? pnlRows[idx - 1] : null
  }, [pnlRows, activeRow])

  // Alerts (mocked but informed by data)
  const alerts: AlertItem[] = useMemo(() => {
    if (!data) return []
    const list: AlertItem[] = []
    const sf = data.salaryFund
    if (sf.usagePercent >= 100) {
      list.push({
        severity: 'danger',
        title: 'Quỹ lương vượt ngưỡng 100%',
        detail: `Đã chi ${formatVND(sf.totalFixedSalary)} / ngưỡng ${formatVND(sf.salaryFundCap)} (${sf.usagePercent.toFixed(1)}%).`,
        link: '/admin/salary-report',
      })
    } else if (sf.usagePercent >= 80) {
      list.push({
        severity: 'warn',
        title: 'Quỹ lương cảnh báo 80%',
        detail: `Đã chi ${formatVND(sf.totalFixedSalary)} / ngưỡng ${formatVND(sf.salaryFundCap)} (${sf.usagePercent.toFixed(1)}%).`,
        link: '/admin/salary-report',
      })
    } else {
      list.push({
        severity: 'ok',
        title: 'Quỹ lương trong ngưỡng an toàn',
        detail: `Sử dụng ${sf.usagePercent.toFixed(1)}% ngưỡng 5% doanh thu CTV.`,
        link: '/admin/salary-report',
      })
    }
    list.push({
      severity: 'warn',
      title: '3 CTV sắp hạ cấp',
      detail: 'Doanh số 30 ngày gần đây thấp hơn ngưỡng duy trì cấp bậc.',
      link: '/admin/ctv',
    })
    list.push({
      severity: 'danger',
      title: '2 hộ kinh doanh sắp hết hạn',
      detail: 'Giấy phép HKD hết hạn trong 30 ngày tới — cần gia hạn.',
      link: '/admin/business-household',
    })
    return list
  }, [data])

  const channelPalette = {
    agency: '#3b82f6',
    ctv: '#10b981',
    showroom: '#f59e0b',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (payload: any) => {
    const month = payload?.payload?.month ?? payload?.month
    if (!month || typeof month !== 'string') return
    setSelectedMonth((prev) => (prev === month ? null : month))
  }

  const exportExcel = () => {
    if (typeof window !== 'undefined') {
      window.alert('Tính năng xuất Excel đang được phát triển. (Mock)')
    }
  }

  const totalCost = data ? Object.values(data.costBreakdown).reduce((a, b) => a + b, 0) : 0

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-900 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 -mt-4 lg:-mt-6 px-4 sm:px-6 py-4 sm:py-6"
      style={{ visibility: mounted ? 'visible' : 'hidden' }}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Quản trị</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng quan chỉ số kinh doanh & phân tích lợi nhuận theo kênh
            </p>
          </div>
          <div className="flex items-center gap-3">
            {updatedAt && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Cập nhật lần cuối: {formatTimestamp(updatedAt)}
              </p>
            )}
            <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">CCB Mart Admin</Badge>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            <p className="font-semibold mb-1">Lỗi tải dữ liệu dashboard</p>
            <p>{error}</p>
            <p className="mt-1 text-xs">
              Kiểm tra backend (port 4000) hoặc chạy:
              <code className="mx-1 px-1 bg-red-100 dark:bg-red-900/40 rounded">cd backend && npx prisma generate && npx prisma db push</code>
            </p>
          </div>
        )}

        {/* Filter bar */}
        <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 text-sm font-medium">
                <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Bộ lọc:
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">Kỳ</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  className="border border-slate-300 dark:border-slate-600 rounded-md text-sm px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="year">Năm nay</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">Kênh</label>
                <select
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value as ChannelKey)
                    setSelectedMonth(null)
                  }}
                  className="border border-slate-300 dark:border-slate-600 rounded-md text-sm px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="all">Tất cả</option>
                  <option value="agency">Cửa hàng đại lý</option>
                  <option value="ctv">CTV</option>
                  <option value="showroom">Showroom</option>
                </select>
              </div>
              {selectedMonth && (
                <div className="flex items-center gap-2 ml-auto">
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    Đang lọc theo: {selectedMonth}
                  </Badge>
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
                  >
                    Bỏ lọc
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ============== ZONE 1: KPI ============== */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
                <CardContent className="p-4">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data && activeRow ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              icon={<DollarSign className="w-4 h-4" />}
              label={`Doanh thu ${activeRow.month}`}
              value={formatVND(activeRow.revenue)}
              delta={prevRow ? <DeltaBadge current={activeRow.revenue} previous={prevRow.revenue} /> : null}
              color="emerald"
            />
            <KpiCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="LN ròng"
              value={formatVND(activeRow.netProfit)}
              delta={prevRow ? <DeltaBadge current={activeRow.netProfit} previous={prevRow.netProfit} /> : null}
              color={activeRow.netProfit < 0 ? 'red' : 'emerald'}
            />
            <KpiCard
              icon={<Percent className="w-4 h-4" />}
              label="Biên LN ròng"
              value={`${activeRow.netMargin.toFixed(1)}%`}
              delta={prevRow ? <DeltaBadge current={activeRow.netMargin} previous={prevRow.netMargin} suffix=" pt" /> : null}
              color={activeRow.netMargin < 0 ? 'red' : 'emerald'}
            />
            <KpiCard
              icon={<Users className="w-4 h-4" />}
              label="CTV active"
              value={formatNumber(data.totalCtvs)}
              delta={<span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
              color="emerald"
            />
            <KpiCard
              icon={<Store className="w-4 h-4" />}
              label="Đại lý"
              value={formatNumber(data.totalAgencies)}
              delta={<span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
              color="emerald"
            />
          </div>
        ) : null}

        {/* Targets + Salary fund summary */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Targets */}
            <Card className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base">
                    <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Mục tiêu ({periodLabel(period)})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {(() => {
                    const pctRev = revenueTarget > 0 ? (data.totalRevenue / revenueTarget) * 100 : 0
                    const pctProfit = profitTarget > 0 ? (data.netProfit / profitTarget) * 100 : 0
                    return (
                      <>
                        <TargetBlock
                          label={`Doanh thu`}
                          target={revenueTarget}
                          actual={data.totalRevenue}
                          pct={pctRev}
                        />
                        <TargetBlock
                          label={`Lợi nhuận ròng`}
                          target={profitTarget}
                          actual={data.netProfit}
                          pct={pctProfit}
                          negative={data.netProfit < 0}
                        />
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Salary fund summary */}
            <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-slate-800 dark:text-slate-100 text-base">Quỹ lương cứng (5%)</CardTitle>
                  <SalaryFundBadge pct={data.salaryFund.usagePercent} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Thực tế / Ngưỡng</span>
                  <span className={`text-sm font-bold ${getSalaryFundColor(data.salaryFund.usagePercent).text}`}>
                    {data.salaryFund.usagePercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">{formatVND(data.salaryFund.totalFixedSalary)}</span>
                  <span className="text-slate-400 dark:text-slate-500"> / </span>
                  <span>{formatVND(data.salaryFund.salaryFundCap)}</span>
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getSalaryFundColor(data.salaryFund.usagePercent).bar}`}
                    style={{ width: `${Math.min(data.salaryFund.usagePercent, 100)}%` }}
                  />
                </div>
                <Link
                  href="/admin/salary-report"
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                >
                  Xem chi tiết
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============== ZONE 2: Charts ============== */}
        {data && (
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                  <button
                    onClick={() => setChartTab('revenue')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      chartTab === 'revenue'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Doanh thu theo kênh
                  </button>
                  <button
                    onClick={() => setChartTab('profit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      chartTab === 'profit'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Xu hướng lợi nhuận
                  </button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Gợi ý: click cột để lọc theo tháng
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                {chartTab === 'revenue' ? (
                  <BarChart data={filteredChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      tickFormatter={(v) => formatVND(v)}
                      width={100}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => {
                        const m: Record<string, string> = { ctv: 'CTV', agency: 'Cửa hàng đại lý', showroom: 'Showroom' }
                        return [formatVND(Number(value)), m[String(name)] ?? String(name)]
                      }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid rgba(148,163,184,0.3)',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        color: '#0f172a',
                      }}
                      cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const m: Record<string, string> = { ctv: 'CTV', agency: 'Cửa hàng đại lý', showroom: 'Showroom' }
                        return m[value] ?? value
                      }}
                    />
                    <Bar dataKey="agency" stackId="revenue" fill={channelPalette.agency} name="agency" onClick={handleBarClick} cursor="pointer" />
                    <Bar dataKey="ctv" stackId="revenue" fill={channelPalette.ctv} name="ctv" onClick={handleBarClick} cursor="pointer" />
                    <Bar dataKey="showroom" stackId="revenue" fill={channelPalette.showroom} name="showroom" radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor="pointer" />
                  </BarChart>
                ) : (
                  <LineChart data={filteredChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      tickFormatter={(v) => formatVND(v)}
                      width={100}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => {
                        const m: Record<string, string> = { grossProfit: 'Lợi nhuận gộp', netProfit: 'Lợi nhuận ròng' }
                        return [formatVND(Number(value)), m[String(name)] ?? String(name)]
                      }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid rgba(148,163,184,0.3)',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        color: '#0f172a',
                      }}
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
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#8b5cf6' }}
                      name="grossProfit"
                    />
                    <Line
                      type="monotone"
                      dataKey="netProfit"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#ef4444' }}
                      name="netProfit"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ============== ZONE 3: P&L / Alerts tabs ============== */}
        {data && (
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                  <button
                    onClick={() => setBottomTab('pnl')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      bottomTab === 'pnl'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                    P&L chi tiết
                  </button>
                  <button
                    onClick={() => setBottomTab('alerts')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      bottomTab === 'alerts'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    Cảnh báo
                    <Badge className="ml-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] px-1.5 py-0 h-4">
                      {alerts.filter((a) => a.severity !== 'ok').length}
                    </Badge>
                  </button>
                </div>
                {bottomTab === 'pnl' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowExtraCols((v) => !v)}
                      className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {showExtraCols ? 'Ẩn cột chi tiết' : 'Hiện thêm cột'}
                    </button>
                    <button
                      onClick={exportExcel}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Xuất Excel
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {bottomTab === 'pnl' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Tháng</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Doanh thu</th>
                        {showExtraCols && (
                          <>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">COGS</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">CP CTV</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">CP đại lý</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Lương cứng</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">OPEX</th>
                          </>
                        )}
                        <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">LN gộp</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">LN ròng</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Biên ròng</th>
                        <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Cảnh báo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pnlRows.length === 0 ? (
                        <tr>
                          <td colSpan={showExtraCols ? 11 : 6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                            Chưa có dữ liệu P&L.
                          </td>
                        </tr>
                      ) : (
                        pnlRows.map((r, idx) => (
                          <tr
                            key={r.month}
                            onClick={() => setSelectedMonth(selectedMonth === r.month ? null : r.month)}
                            className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
                              selectedMonth === r.month
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : idx % 2 === 0
                                ? 'bg-white dark:bg-slate-800'
                                : 'bg-slate-50/60 dark:bg-slate-900/30'
                            } hover:bg-emerald-50 dark:hover:bg-emerald-900/20`}
                          >
                            <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200">{r.month}</td>
                            <td className="py-2.5 px-3 text-right text-slate-900 dark:text-slate-100">{formatVND(r.revenue)}</td>
                            {showExtraCols && (
                              <>
                                <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">{formatVND(r.cogs)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">{formatVND(r.ctvCommission)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">{formatVND(r.agencyCommission)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">{formatVND(r.fixedSalary)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">{formatVND(r.opex)}</td>
                              </>
                            )}
                            <td className={`py-2.5 px-3 text-right font-medium ${r.grossProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-700 dark:text-violet-400'}`}>
                              {formatVND(r.grossProfit)}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-semibold ${r.netProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                              {formatVND(r.netProfit)}
                            </td>
                            <td className={`py-2.5 px-3 text-right ${r.netMargin < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                              {r.netMargin.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <AlertBadge severity={r.warning} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    * COGS 50% blended. Biên ròng dưới 3% = cảnh báo, âm = nguy hiểm. Click hàng để lọc dashboard theo tháng.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((a, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        a.severity === 'danger'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : a.severity === 'warn'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      <div className="text-lg leading-none pt-0.5">
                        <AlertBadge severity={a.severity} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{a.detail}</p>
                        {a.link && (
                          <Link
                            href={a.link}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 mt-1"
                          >
                            Đi tới
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cost summary (compact, kept for context) */}
        {data && totalCost > 0 && (
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-800 dark:text-slate-100 text-base">Cơ cấu chi phí</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {Object.entries(data.costBreakdown).map(([key, value]) => {
                  const pct = totalCost > 0 ? ((value / totalCost) * 100).toFixed(1) : '0.0'
                  const labels: Record<string, string> = {
                    cogs: 'Giá vốn',
                    ctvCommissions: 'HH CTV',
                    agencyCommissions: 'CK đại lý',
                    xwiseFee: 'Phí Xwise',
                    e29Fee: 'Phí E29',
                    logistics: 'Logistics',
                    marketing: 'Marketing',
                    opcoOverhead: 'OpCo',
                    fixedCosts: 'Cố định',
                  }
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50 dark:bg-slate-900/40"
                    >
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {labels[key] ?? key}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {formatVND(value)}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{pct}%</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: React.ReactNode
  color: 'emerald' | 'red'
}) {
  const iconColor =
    color === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-emerald-600 dark:text-emerald-400'
  return (
    <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 ${iconColor} mb-1`}>
          {icon}
          <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p
          className={`text-xl font-bold ${
            color === 'red'
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {value}
        </p>
        <div className="mt-1">{delta}</div>
      </CardContent>
    </Card>
  )
}

function TargetBlock({
  label,
  target,
  actual,
  pct,
  negative = false,
}: {
  label: string
  target: number
  actual: number
  pct: number
  negative?: boolean
}) {
  const barColor =
    negative
      ? 'bg-red-500'
      : pct >= 100
      ? 'bg-emerald-500'
      : pct >= 80
      ? 'bg-yellow-400'
      : 'bg-blue-500'
  const pctColor =
    negative
      ? 'text-red-700 dark:text-red-400'
      : pct >= 100
      ? 'text-emerald-700 dark:text-emerald-400'
      : pct >= 80
      ? 'text-yellow-700 dark:text-yellow-400'
      : 'text-slate-700 dark:text-slate-200'
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
      <div className="flex justify-between items-start mb-1.5">
        <div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{formatVND(target)}</p>
        </div>
        <span className={`text-sm font-bold ${pctColor}`}>{pct.toFixed(1)}%</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 mb-1.5">
        Thực tế:{' '}
        <span className={`font-semibold ${negative ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
          {formatVND(actual)}
        </span>
      </p>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}
