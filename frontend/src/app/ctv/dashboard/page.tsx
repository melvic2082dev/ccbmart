'use client'

import { useEffect, useState } from 'react'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, ShoppingCart, Wallet, Award, Gift, Star, ArrowUpCircle, Clock, Target, Trophy } from 'lucide-react'

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
    fixedSalary: { trainedMinutes: number; requiredMinutes: number; eligible: boolean }
    promotion: { targetRank: string; requirements: KpiRequirement[] } | null
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

function TreeNode({ member, depth = 0, defaultOpen = true }: { member: TreeMember; depth?: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = !!(member.children && member.children.length > 0)
  const self = member.selfCombos ?? 0
  const team = member.teamCombos ?? self
  return (
    <li>
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-emerald-50 transition-colors">
        {hasChildren ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-4 h-4 flex items-center justify-center text-emerald-600 hover:text-emerald-800"
            aria-label={open ? 'Thu gọn' : 'Mở rộng'}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 h-4 inline-flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
        )}
        <span className="font-medium text-gray-800">{member.name}</span>
        <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0">{member.rank}</Badge>
        <span className="text-xs font-mono text-gray-600">{self}/({team})</span>
      </div>
      {hasChildren && open && (
        <ul className="border-l-2 border-emerald-100 ml-5 pl-2 mt-0.5 space-y-0.5">
          {member.children!.map((child, idx) => (
            <TreeNode key={child.id ?? idx} member={child} depth={depth + 1} defaultOpen={defaultOpen} />
          ))}
        </ul>
      )}
    </li>
  )
}

function ProgressBar({ pct, color = 'emerald' }: { pct: number; color?: 'emerald' | 'amber' | 'purple' }) {
  const cls: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  }
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full ${cls[color]} transition-all`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

function KpiRow({ label, current, target, unit, isMoney, color }: { label: string; current: number; target: number; unit?: string; isMoney?: boolean; color?: 'emerald' | 'amber' | 'purple' }) {
  const pct = target > 0 ? (current / target) * 100 : 0
  const fmt = (n: number) => isMoney ? formatVND(n) : `${n.toLocaleString('vi-VN')}${unit ? ` ${unit}` : ''}`
  const done = current >= target
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={`font-mono ${done ? 'text-emerald-700 font-semibold' : 'text-gray-600'}`}>
          {fmt(current)} / <span className="text-gray-500">{fmt(target)}</span>
        </span>
      </div>
      <ProgressBar pct={pct} color={done ? 'emerald' : color} />
    </div>
  )
}

export default function CTVDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [treeRoot, setTreeRoot] = useState<TreeMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [treeLoading, setTreeLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [treeKey, setTreeKey] = useState(0)
  const [defaultOpen, setDefaultOpen] = useState(true)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    try {
      const u = localStorage.getItem('user')
      if (u) setUserName(JSON.parse(u).name || '')
    } catch { /* ignore */ }
  }, [])

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

  const toggleAll = (open: boolean) => {
    setDefaultOpen(open)
    setTreeKey(k => k + 1) // force re-mount so all TreeNode reset their open state
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {userName ? `Chào, ${userName}` : 'Trang chủ'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{monthLabel}</span>
            {data && (
              <>
                <span>·</span>
                <Badge className="bg-emerald-500 text-white text-xs px-2 py-0.5">
                  <Award className="w-3 h-3 mr-1 inline" />
                  {data.rank}
                </Badge>
              </>
            )}
            {data?.professionalTitle?.isActive && (
              <Badge className="bg-purple-500 text-white text-xs px-2 py-0.5">
                <Star className="w-3 h-3 mr-1 inline" />
                {TITLE_LABELS[data.professionalTitle.title] || data.professionalTitle.title}
              </Badge>
            )}
            {data?.promotionStatus && (
              <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5">
                <ArrowUpCircle className="w-3 h-3 mr-1 inline" />
                Đủ điều kiện {data.promotionStatus.targetRank}
              </Badge>
            )}
            {updatedAt && (
              <span className="ml-auto flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3 shrink-0" />
                {updatedAt.toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        </div>

        {data?.kpi && (
          <Card className="border-emerald-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" /> Chỉ tiêu tháng này
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Duy trì lương cứng</p>
                <KpiRow
                  label="Đào tạo (giờ đã xác nhận)"
                  current={Math.round(data.kpi.fixedSalary.trainedMinutes / 60 * 10) / 10}
                  target={data.kpi.fixedSalary.requiredMinutes / 60}
                  unit="giờ"
                  color="amber"
                />
              </div>
              {data.kpi.promotion ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Lên cấp {data.kpi.promotion.targetRank}
                  </p>
                  <div className="space-y-3">
                    {data.kpi.promotion.requirements.map((r, i) => (
                      <KpiRow key={i} label={r.label} current={r.current} target={r.target} isMoney={r.isMoney} color="amber" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 flex items-center gap-2">
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
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Bán hàng</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Wallet className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Doanh thu</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{formatVND(data.currentRevenue)}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <ShoppingCart className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Combo đã bán</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{data.currentCombos}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Tăng trưởng</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">
                      {data.revenueGrowth >= 0 ? '+' : ''}{data.revenueGrowth}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Khách & đội ngũ</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Khách hàng</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalCustomers}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Trực tiếp</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{data.teamSize}</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Thưởng</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-amber-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <Gift className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Điểm dẫn dắt</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{(data.loyaltyPoints || 0).toLocaleString('vi-VN')}</p>
                  </CardContent>
                </Card>
                {data.teamBonus && (
                  <Card className="border-purple-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Gift className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Thưởng dẫn dắt</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{formatVND(data.teamBonus.bonusAmount)}</p>
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
              <CardTitle className="text-gray-800">Doanh thu theo tháng</CardTitle>
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
              <CardTitle className="text-gray-800">Chi tiết hoa hồng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Hoa hồng cá nhân</p>
                  <p className="text-base font-bold text-gray-900">{formatVND(data.commission.selfCommission)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">HH trực tiếp</p>
                  <p className="text-base font-bold text-gray-900">{formatVND(data.commission.directCommission)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">HH gián tiếp cấp 2</p>
                  <p className="text-base font-bold text-gray-900">{formatVND(data.commission.indirect2Commission)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">HH gián tiếp cấp 3</p>
                  <p className="text-base font-bold text-gray-900">{formatVND(data.commission.indirect3Commission)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Lương cứng</p>
                  <p className="text-base font-bold text-gray-900">{formatVND(data.commission.fixedSalary)}</p>
                </div>
                <div className="bg-emerald-600 rounded-lg p-3">
                  <p className="text-xs text-emerald-100 font-medium mb-1">Tổng thu nhập</p>
                  <p className="text-base font-bold text-white">{formatVND(data.commission.totalIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-gray-800">Cây quản lý đội nhóm</CardTitle>
              <p className="text-[11px] text-gray-500 mt-1">Số combo tháng này — <span className="font-mono">cá nhân/(nhánh)</span></p>
            </div>
            {treeRoot && (
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => toggleAll(true)} className="px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  Mở rộng tất cả
                </button>
                <button onClick={() => toggleAll(false)} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Thu gọn tất cả
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {treeLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : !treeRoot ? (
              <p className="text-gray-500 text-sm text-center py-6">Chưa có thành viên trong đội nhóm</p>
            ) : (
              <ul key={treeKey} className="space-y-1">
                <TreeNode member={treeRoot} defaultOpen={defaultOpen} />
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
