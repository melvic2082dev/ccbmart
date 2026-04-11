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
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, Users } from 'lucide-react'

interface Ctv {
  id: number
  name: string
  email: string
  rank: string
  parentName: string | null
  f1Count: number
  transactionCount: number
  customerCount: number
  status: string
}

interface CtvTreeNode {
  id: number
  name: string
  email: string
  rank: string
  children: CtvTreeNode[]
}

const RANK_BADGE: Record<string, string> = {
  GDKD: 'bg-purple-100 text-purple-700 border border-purple-300',
  GDV: 'bg-blue-100 text-blue-700 border border-blue-300',
  TP: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  PP: 'bg-amber-100 text-amber-700 border border-amber-300',
  CTV: 'bg-slate-100 text-slate-700 border border-slate-300',
}

function RankBadge({ rank }: { rank: string }) {
  const cls = RANK_BADGE[rank] ?? 'bg-gray-100 text-gray-700 border border-gray-300'
  return <Badge className={`text-xs px-2 py-0.5 ${cls}`}>{rank}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active' || status === 'ACTIVE'
  return (
    <Badge
      className={
        active
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs'
          : 'bg-gray-100 text-gray-500 border border-gray-300 text-xs'
      }
    >
      {active ? 'Hoạt động' : 'Dừng'}
    </Badge>
  )
}

function TreeNode({ node, depth }: { node: CtvTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-emerald-50 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-gray-400 hover:text-emerald-600 flex-shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </Button>
        ) : (
          <span className="w-5 flex-shrink-0 text-gray-300 text-xs select-none">─</span>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-800 text-sm truncate">{node.name}</span>
          <RankBadge rank={node.rank} />
          <span className="text-xs text-gray-400 truncate hidden sm:block">{node.email}</span>
        </div>

        {hasChildren && (
          <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
            {node.children.length} F1
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="border-l border-gray-100 ml-6">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminCtvPage() {
  const [ctvs, setCtvs] = useState<Ctv[]>([])
  const [tree, setTree] = useState<CtvTreeNode[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingTree, setLoadingTree] = useState(true)

  useEffect(() => {
    api
      .adminCtvs()
      .then((data) => setCtvs(Array.isArray(data) ? data : data.ctvs ?? []))
      .catch((err) => console.error('Failed to fetch CTVs:', err))
      .finally(() => setLoadingList(false))

    api
      .adminCtvTree()
      .then((data) => setTree(Array.isArray(data) ? data : data.tree ?? []))
      .catch((err) => console.error('Failed to fetch CTV tree:', err))
      .finally(() => setLoadingTree(false))
  }, [])

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý CTV</h1>
          <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">CCB Mart Admin</Badge>
        </div>

        {/* CTV Table */}
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-gray-800">
                Danh sách CTV
                {!loadingList && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({ctvs.length} người)
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingList ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/6" />
                    <div className="h-4 bg-gray-200 rounded w-1/6" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-gray-600 font-semibold">Tên</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Email</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Rank</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Quản lý</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">Số F1</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">Giao dịch</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">Khách hàng</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ctvs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                          Không có dữ liệu
                        </TableCell>
                      </TableRow>
                    ) : (
                      ctvs.map((ctv) => (
                        <TableRow key={ctv.id} className="hover:bg-emerald-50 transition-colors">
                          <TableCell className="font-medium text-gray-800">{ctv.name}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{ctv.email}</TableCell>
                          <TableCell>
                            <RankBadge rank={ctv.rank} />
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {ctv.parentName ?? <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">{ctv.f1Count}</TableCell>
                          <TableCell className="text-right text-gray-700">
                            {ctv.transactionCount}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {ctv.customerCount}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ctv.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTV Tree */}
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800">Cây tổ chức CTV</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTree ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex gap-3 items-center"
                    style={{ paddingLeft: `${(i % 3) * 20}px` }}
                  >
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </div>
                ))}
              </div>
            ) : tree.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Không có dữ liệu</p>
            ) : (
              <div className="space-y-0.5">
                {tree.map((node) => (
                  <TreeNode key={node.id} node={node} depth={0} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
