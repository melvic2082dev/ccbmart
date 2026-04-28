'use client'

import { useEffect, useState } from 'react'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, ShoppingCart, Wallet, Gift, Star, ArrowUpCircle, Clock, Target, Trophy } from 'lucide-react'

interface Commission {
  selfCommission: number
  directCommission: number
  indirect2Commission: number
  indirect3Commission: number
  fixedSalary: number
  totalIncome: number
}

interface ChartData {
  month: string
  revenue: number
}

interface KpiRequirement {
  label: string
  current: number
  target: number
  isMoney?: boolean
}

interface DashboardData {
  currentRevenue: number
  currentCombos: number
  revenueGrowth: number
  totalCustomers: number
  teamSize: number
  rank: string
  chartData: ChartData[]
  commission: Commission
  loyaltyPoints: number
  professionalTitle: { title: string; isActive: boolean } | null
  promotionStatus: { targetRank: string; status: string } | null
  teamBonus: { bonusAmount: number; status: string } | null
  kpi: {
    maintenance: { rank: string; requirements: KpiRequirement[] } | null
    promotion: { targetRank: string; requirements: KpiRequirement[]; note?: string } | null
  }
}

interface TreeMember {
  id?: number
  name: string
  rank: string
  selfCombos?: number
  teamCombos?: number
  children?: TreeMember[]
}

const TITLE_LABELS: Record<string, string> = {
  EXPERT_LEADER: 'Chuyên gia Dẫn dắt',
  SENIOR_EXPERT: 'Chuyên gia Cấp cao',
  STRATEGIC_ADVISOR: 'Cố vấn Chiến lược',
};

// Group labels per the requesting user's rank — corporate-department metaphor
// per V13.4 spec. Layer N corresponds to N hops down the management chain.
// Each rank only sees the layers spec defines for it; deeper layers are dropped.
const TEAM_GROUP_LABELS: Record<string, string[]> = {
  CTV:  ['Trực tiếp'],
  PP:   ['Trực tiếp'],
  TP:   ['Trực tiếp', 'Gián tiếp cấp 1 — Chuyên viên'],
  GDV:  ['Trực tiếp', 'Gián tiếp cấp 1 — Chuyên viên', 'Gián tiếp cấp 2 — Chuyên viên'],
  GDKD: ['Trực tiếp', 'Gián tiếp cấp 1 — Cấp phòng', 'Gián tiếp cấp 2 — Phó phòng', 'Gián tiếp cấp 3 — Chuyên viên'],
}

function flattenByDepth(root: TreeMember | null): TreeMember[][] {
  if (!root) return []
  const layers: TreeMember[][] = []
  let current = root.children || []
  while (current.length > 0) {
    layers.push(current)
    current = current.flatMap(m => m.children || [])
  }
  return layers
}

function MemberRow({ m }: { m: TreeMember }) {
  const self = m.selfCombos ?? 0
  const team = m.teamCombos ?? self
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span className="font-medium text-foreground truncate">{m.name}</span>
        <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs px-1.5 py-0 shrink-0">{m.rank}</Badge>
      </div>
      <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">{self}/({team})</span>
    </div>
  )
}

function ProgressBar({ pct, done, color = 'amber' }: { pct: number; done: boolean; color?: 'emerald' | 'amber' }) {
  const fillCls = done ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${fillCls} transition-all`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

function KpiRow({ label, current, target, isMoney, color }: { label: string; current: number; target: number; isMoney?: boolean; color?: 'emerald' | 'amber' }) {
  const pct = target > 0 ? (current / target) * 100 : 0
  const fmt = (n: number) => isMoney ? formatVND(n) : n.toLocaleString('vi-VN')
  const done = current >= target
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-sm gap-2">
        <span className="text-foreground">{label}</span>
        <span className={`font-mono tabular-nums ${done ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-foreground'}`}>
          {fmt(current)} <span className="text-muted-foreground">/ {fmt(target)}</span>
        </span>
      </div>
      <ProgressBar pct={pct} done={done} color={color} />
    </div>
  )
}

export default function CTVDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [treeRoot, setTreeRoot] = useState<TreeMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [treeLoading, setTreeLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const now = new Date()
  const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await api.ctvDashboard()
        setData(result)
        setUpdatedAt(new Date())
      } catch (err) {
        console.error('Failed to fetch CTV dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    async function fetchTree() {
      try {
        const result = await api.ctvTree()
        setTreeRoot(result && typeof result === 'object' ? result : null)
      } catch (err) {
        console.error('Failed to fetch CTV tree:', err)
      } finally {
        setTreeLoading(false)
      }
    }

    fetchData()
    fetchTree()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tổng quan</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data?.professionalTitle?.isActive && (
              <Badge className="bg-purple-500 text-white text-xs px-2 py-1">
                <Star className="w-3 h-3 mr-1 inline" />
                {TITLE_LABELS[data.professionalTitle.title] || data.professionalTitle.title}
              </Badge>
            )}
            {data?.promotionStatus && (
              <Badge className="bg-amber-500 text-white text-xs px-2 py-1">
                <ArrowUpCircle className="w-3 h-3 mr-1 inline" />
                Đủ điều kiện {data.promotionStatus.targetRank}
              </Badge>
            )}
            {updatedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                {updatedAt.toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        </div>

        {data?.kpi && (data.kpi.maintenance || data.kpi.promotion) && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Chỉ tiêu tháng này
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.kpi.maintenance && data.kpi.maintenance.requirements.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                    Duy trì cấp {data.kpi.maintenance.rank}
                  </p>
                  <div className="space-y-3">
                    {data.kpi.maintenance.requirements.map((r, i) => (
                      <KpiRow key={i} label={r.label} current={r.current} target={r.target} isMoney={r.isMoney} color="emerald" />
                    ))}
                  </div>
                </div>
              )}
              {data.kpi.promotion ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Lên cấp {data.kpi.promotion.targetRank}
                  </p>
                  <div className="space-y-3">
                    {data.kpi.promotion.requirements.map((r, i) => (
                      <KpiRow key={i} label={r.label} current={r.current} target={r.target} isMoney={r.isMoney} color="amber" />
                    ))}
                  </div>
                  {data.kpi.promotion.note && (
                    <p className="mt-2 text-xs text-muted-foreground italic">{data.kpi.promotion.note}</p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Bạn đã ở cấp cao nhất — tiếp tục dẫn dắt đội nhóm.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-6 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bán hàng</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Wallet className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Doanh thu</span>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">{formatVND(data.currentRevenue)}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <ShoppingCart className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Combo đã bán</span>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">{data.currentCombos}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Tăng trưởng</span>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {data.revenueGrowth >= 0 ? '+' : ''}{data.revenueGrowth}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Khách & đội ngũ</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Khách hàng</span>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">{data.totalCustomers}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Trực tiếp</span>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">{data.teamSize}</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Thưởng</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-amber-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <Gift className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Điểm dẫn dắt</span>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">{(data.loyaltyPoints || 0).toLocaleString('vi-VN')}</p>
                  </CardContent>
                </Card>
                {data.teamBonus && (
                  <Card className="border-purple-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Gift className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Thưởng dẫn dắt</span>
                      </div>
                      <p className="text-xl font-bold text-foreground tabular-nums">{formatVND(data.teamBonus.bonusAmount)}</p>
                      <Badge className={`mt-1 text-xs ${data.teamBonus.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {data.teamBonus.status === 'PAID' ? 'Đã trả' : 'Chờ xử lý'}
                      </Badge>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </>
        ) : null}

        {data && (
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Doanh thu theo tháng</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(v) => formatVND(v)}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatVND(Number(value)), 'Doanh thu']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #d1fae5' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data && (
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Chi tiết hoa hồng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Hoa hồng cá nhân</p>
                  <p className="text-base font-bold text-foreground tabular-nums">{formatVND(data.commission.selfCommission)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">HH trực tiếp</p>
                  <p className="text-base font-bold text-foreground tabular-nums">{formatVND(data.commission.directCommission)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">HH gián tiếp cấp 2</p>
                  <p className="text-base font-bold text-foreground tabular-nums">{formatVND(data.commission.indirect2Commission)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">HH gián tiếp cấp 3</p>
                  <p className="text-base font-bold text-foreground tabular-nums">{formatVND(data.commission.indirect3Commission)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Lương cứng</p>
                  <p className="text-base font-bold text-foreground tabular-nums">{formatVND(data.commission.fixedSalary)}</p>
                </div>
                <div className="bg-emerald-600 rounded-lg p-3">
                  <p className="text-xs text-emerald-100 font-medium mb-1">Tổng thu nhập</p>
                  <p className="text-base font-bold text-white">{formatVND(data.commission.totalIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Đội ngũ quản lý</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Số combo tháng này — <span className="font-mono">cá nhân/(nhánh)</span></p>
          </CardHeader>
          <CardContent>
            {treeLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : !treeRoot ? (
              <p className="text-muted-foreground text-sm text-center py-6">Chưa có thành viên trong đội nhóm</p>
            ) : (
              (() => {
                const layers = flattenByDepth(treeRoot)
                const labels = TEAM_GROUP_LABELS[data?.rank || 'CTV'] || TEAM_GROUP_LABELS.CTV
                const visible = labels.map((label, i) => ({ label, members: layers[i] || [] })).filter(g => g.members.length > 0)
                if (visible.length === 0) {
                  return <p className="text-muted-foreground text-sm text-center py-6">Chưa có thành viên trong đội nhóm</p>
                }
                return (
                  <div className="space-y-5">
                    {visible.map((group) => (
                      <section key={group.label}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-baseline justify-between">
                          <span>{group.label}</span>
                          <span className="text-muted-foreground font-normal normal-case tracking-normal">{group.members.length} người</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {group.members.map(m => <MemberRow key={m.id} m={m} />)}
                        </div>
                      </section>
                    ))}
                  </div>
                )
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
