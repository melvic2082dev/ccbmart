'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronRight, ChevronDown, Users, Search, Download, UserPlus,
  Eye, ArrowUpDown, Shuffle, Power, Bell, GraduationCap,
} from 'lucide-react';
import {
  RankChangeModal, ReassignModal, ToggleActiveModal, CreateCtvModal, CtvDetailsModal,
  BulkNotificationModal, type CtvRow,
} from './modals';

interface CtvTreeNode {
  id: number;
  name: string;
  email: string;
  rank: string;
  children: CtvTreeNode[];
}

const RANK_BADGE: Record<string, string> = {
  GDKD: 'bg-purple-100 text-purple-700 border border-purple-300',
  GDV:  'bg-blue-100 text-blue-700 border border-blue-300',
  TP:   'bg-emerald-100 text-emerald-700 border border-emerald-300',
  PP:   'bg-amber-100 text-amber-700 border border-amber-300',
  CTV:  'bg-slate-100 text-slate-700 border border-slate-300',
};
const RANK_LABEL: Record<string, string> = {
  CTV: 'CTV', PP: 'PP', TP: 'TP', GDV: 'GĐV', GDKD: 'GĐKD',
};
const RANK_ORDER = ['GDKD', 'GDV', 'TP', 'PP', 'CTV'];
const PAGE_SIZE = 15;

function RankBadge({ rank }: { rank: string }) {
  const cls = RANK_BADGE[rank] ?? 'bg-gray-100 text-gray-700 border border-gray-300';
  return <Badge className={`text-xs px-2 py-0.5 ${cls}`}>{RANK_LABEL[rank] ?? rank}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active' || status === 'ACTIVE';
  return (
    <Badge className={active
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs'
      : 'bg-gray-100 text-gray-500 border border-gray-300 text-xs'}>
      {active ? 'Hoạt động' : 'Dừng'}
    </Badge>
  );
}

function AccountTypeBadges({ ctv }: { ctv: CtvRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs">CTV</Badge>
      {ctv.isMember && ctv.memberWallet && (
        <Badge
          className="bg-purple-100 text-purple-700 border border-purple-300 text-xs"
          title={`Hạng: ${ctv.memberWallet.tier} · Ví: ${ctv.memberWallet.balance.toLocaleString('vi-VN')}đ`}
        >
          TV {ctv.memberWallet.tier}
        </Badge>
      )}
    </div>
  );
}

function TrainingHoursCell({ hours, required }: { hours: number; required: number }) {
  let color = 'text-red-600 bg-red-50 border-red-200';
  if (hours >= required) color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  else if (hours >= 15) color = 'text-amber-700 bg-amber-50 border-amber-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}>
      <GraduationCap className="w-3 h-3" />
      {hours}/{required}h
    </span>
  );
}

function TreeNode({
  node, depth, onContextMenu,
}: {
  node: CtvTreeNode;
  depth: number;
  onContextMenu: (e: React.MouseEvent, node: CtvTreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-emerald-50 transition-colors cursor-context-menu"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {hasChildren ? (
          <Button
            variant="ghost" size="sm"
            className="h-5 w-5 p-0 text-gray-400 hover:text-emerald-600 flex-shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
            {node.children.length} trực tiếp
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-gray-100 ml-6">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeCtxMenu {
  x: number;
  y: number;
  nodeId: number;
}

export default function AdminCtvPage() {
  const [ctvs, setCtvs] = useState<CtvRow[]>([]);
  const [tree, setTree] = useState<CtvTreeNode[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingTree, setLoadingTree] = useState(true);

  // Filters + pagination
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('ALL');
  const [managerFilter, setManagerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Modal state
  const [selectedCtv, setSelectedCtv] = useState<CtvRow | null>(null);
  const [openRank, setOpenRank] = useState(false);
  const [openReassign, setOpenReassign] = useState(false);
  const [openToggle, setOpenToggle] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openBulkNotify, setOpenBulkNotify] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Tree context menu (P1.4)
  const [treeMenu, setTreeMenu] = useState<TreeCtxMenu | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadCtvs = useCallback(() => {
    setLoadingList(true);
    api.adminCtvs()
      .then((d) => setCtvs(Array.isArray(d) ? (d as CtvRow[]) : (d as { ctvs?: CtvRow[] }).ctvs ?? []))
      .catch((err) => console.error('Failed to fetch CTVs:', err))
      .finally(() => setLoadingList(false));
  }, []);

  const loadTree = useCallback(() => {
    setLoadingTree(true);
    api.adminCtvTree()
      .then((d) => setTree(Array.isArray(d) ? (d as CtvTreeNode[]) : (d as { tree?: CtvTreeNode[] }).tree ?? []))
      .catch((err) => console.error('Failed to fetch CTV tree:', err))
      .finally(() => setLoadingTree(false));
  }, []);

  useEffect(() => { loadCtvs(); loadTree(); }, [loadCtvs, loadTree]);

  const onActionSuccess = () => { loadCtvs(); loadTree(); };

  // Derived: unique manager list for filter dropdown
  const managerOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const c of ctvs) {
      if (c.parentName && !seen.has(c.parentName)) {
        seen.add(c.parentName);
        opts.push(c.parentName);
      }
    }
    return opts.sort((a, b) => a.localeCompare(b));
  }, [ctvs]);

  // Filtered + paginated
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ctvs.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
      if (rankFilter !== 'ALL' && c.rank !== rankFilter) return false;
      if (managerFilter !== 'ALL' && c.parentName !== managerFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'active' && !c.isActive) return false;
        if (statusFilter === 'inactive' && c.isActive) return false;
      }
      return true;
    }).sort((a, b) => {
      const ra = RANK_ORDER.indexOf(a.rank);
      const rb = RANK_ORDER.indexOf(b.rank);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }, [ctvs, search, rankFilter, managerFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, rankFilter, managerFilter, statusFilter]);

  const openActionFor = (ctv: CtvRow, action: 'details' | 'rank' | 'reassign' | 'toggle') => {
    setSelectedCtv(ctv);
    if (action === 'details') setOpenDetails(true);
    if (action === 'rank') setOpenRank(true);
    if (action === 'reassign') setOpenReassign(true);
    if (action === 'toggle') setOpenToggle(true);
  };

  // Tree right-click handler
  const handleTreeContextMenu = useCallback((e: React.MouseEvent, node: CtvTreeNode) => {
    e.preventDefault();
    setTreeMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!treeMenu) return;
    const close = () => setTreeMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [treeMenu]);

  const runTreeAction = (action: 'details' | 'rank' | 'reassign' | 'toggle') => {
    if (!treeMenu) return;
    const ctv = ctvs.find(c => c.id === treeMenu.nodeId);
    if (ctv) openActionFor(ctv, action);
    setTreeMenu(null);
  };

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const ids = paged.map(c => c.id);
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectedCtvList = ctvs.filter(c => selectedIds.has(c.id));

  const downloadExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api.adminCtvExportUrl(), {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ctv-list-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Xuất Excel thất bại');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý CTV</h1>
          <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">CCB Mart Admin</Badge>
        </div>

        {/* CTV Table */}
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-gray-800">
                  Danh sách CTV
                  {!loadingList && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({filtered.length}/{ctvs.length} người)
                    </span>
                  )}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenBulkNotify(true)}
                  disabled={selectedIds.size === 0}
                  title={selectedIds.size === 0 ? 'Chọn ít nhất 1 CTV' : `Gửi thông báo cho ${selectedIds.size} CTV`}
                >
                  <Bell className="w-4 h-4 mr-1" />
                  Gửi thông báo {selectedIds.size > 0 && `(${selectedIds.size})`}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadExcel}>
                  <Download className="w-4 h-4 mr-1" /> Xuất Excel
                </Button>
                <Button size="sm" onClick={() => setOpenCreate(true)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Tạo CTV mới
                </Button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên / email…"
                  className="pl-8"
                />
              </div>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả rank</option>
                {RANK_ORDER.map(r => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}
              </select>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả quản lý</option>
                {managerOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã dừng</option>
              </select>
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
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Chọn tất cả"
                          checked={paged.length > 0 && paged.every(c => selectedIds.has(c.id))}
                          onChange={toggleSelectAllVisible}
                          className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                        />
                      </TableHead>
                      <TableHead className="text-gray-600 font-semibold">Tên</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Email</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Rank</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Loại TK</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Quản lý</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Đào tạo</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">Chi tiêu CN</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">F1</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">GD</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">KH</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Trạng thái</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-gray-400 py-8">
                          Không có dữ liệu phù hợp
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((ctv) => (
                        <TableRow
                          key={ctv.id}
                          className={`hover:bg-emerald-50 transition-colors ${selectedIds.has(ctv.id) ? 'bg-emerald-50/60' : ''}`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              aria-label={`Chọn ${ctv.name}`}
                              checked={selectedIds.has(ctv.id)}
                              onChange={() => toggleSelect(ctv.id)}
                              className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                            />
                          </TableCell>
                          <TableCell className="font-medium text-gray-800">{ctv.name}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{ctv.email}</TableCell>
                          <TableCell><RankBadge rank={ctv.rank} /></TableCell>
                          <TableCell><AccountTypeBadges ctv={ctv} /></TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {ctv.parentName ?? <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell>
                            <TrainingHoursCell
                              hours={ctv.currentMonthTrainingHours ?? 0}
                              required={ctv.requiredTrainingHours ?? 20}
                            />
                          </TableCell>
                          <TableCell className="text-right text-gray-700 text-xs">
                            {ctv.memberWallet
                              ? <span title="Tổng chi tiêu cá nhân (qua ví Thành viên)">
                                  {ctv.memberWallet.totalSpent.toLocaleString('vi-VN')}đ
                                </span>
                              : <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">{ctv.f1Count}</TableCell>
                          <TableCell className="text-right text-gray-700">{ctv.transactionCount}</TableCell>
                          <TableCell className="text-right text-gray-700">{ctv.customerCount}</TableCell>
                          <TableCell><StatusBadge status={ctv.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon-sm" title="Xem chi tiết" onClick={() => openActionFor(ctv, 'details')}>
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" title="Đổi rank" onClick={() => openActionFor(ctv, 'rank')}>
                                <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" title="Chuyển quản lý" onClick={() => openActionFor(ctv, 'reassign')}>
                                <Shuffle className="w-4 h-4 text-amber-600" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" title={ctv.isActive ? 'Ngừng' : 'Kích hoạt'} onClick={() => openActionFor(ctv, 'toggle')}>
                                <Power className={`w-4 h-4 ${ctv.isActive ? 'text-red-500' : 'text-emerald-600'}`} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {filtered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                    <p className="text-gray-500">
                      Trang {page}/{totalPages} · Hiển thị {paged.length} trong {filtered.length} CTV
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        ← Trước
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        Sau →
                      </Button>
                    </div>
                  </div>
                )}
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
                  <div key={i} className="animate-pulse flex gap-3 items-center" style={{ paddingLeft: `${(i % 3) * 20}px` }}>
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </div>
                ))}
              </div>
            ) : tree.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Không có dữ liệu</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-gray-500 italic">
                  💡 Click chuột phải vào một CTV để mở menu thao tác
                </p>
                <div className="space-y-0.5">
                  {tree.map((node) => (
                    <TreeNode key={node.id} node={node} depth={0} onContextMenu={handleTreeContextMenu} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tree right-click context menu */}
      {treeMenu && (
        <div
          className="fixed z-50 min-w-[200px] rounded-md border bg-white dark:bg-slate-800 shadow-lg py-1"
          style={{ top: treeMenu.y, left: treeMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ContextMenuItem icon={<Eye className="w-4 h-4 text-blue-600" />} label="Xem chi tiết" onClick={() => runTreeAction('details')} />
          <ContextMenuItem icon={<ArrowUpDown className="w-4 h-4 text-emerald-600" />} label="Thay đổi rank" onClick={() => runTreeAction('rank')} />
          <ContextMenuItem icon={<Shuffle className="w-4 h-4 text-amber-600" />} label="Chuyển quản lý" onClick={() => runTreeAction('reassign')} />
          <ContextMenuItem icon={<Power className="w-4 h-4 text-red-500" />} label="Kích hoạt / Ngừng" onClick={() => runTreeAction('toggle')} />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 shadow-lg">
          {toast}
        </div>
      )}

      {/* Modals */}
      <RankChangeModal
        open={openRank} onOpenChange={setOpenRank}
        ctv={selectedCtv} onSuccess={onActionSuccess}
      />
      <ReassignModal
        open={openReassign} onOpenChange={setOpenReassign}
        ctv={selectedCtv} allCtvs={ctvs} onSuccess={onActionSuccess}
      />
      <ToggleActiveModal
        open={openToggle} onOpenChange={setOpenToggle}
        ctv={selectedCtv} onSuccess={onActionSuccess}
      />
      <CreateCtvModal
        open={openCreate} onOpenChange={setOpenCreate}
        allCtvs={ctvs} onSuccess={onActionSuccess}
      />
      <CtvDetailsModal
        open={openDetails} onOpenChange={setOpenDetails}
        ctvId={selectedCtv?.id ?? null}
      />
      <BulkNotificationModal
        open={openBulkNotify}
        onOpenChange={setOpenBulkNotify}
        selectedCtvs={selectedCtvList}
        onSuccess={(sent) => {
          setToast(`Đã gửi thông báo cho ${sent} CTV`);
          clearSelection();
        }}
      />
    </>
  );
}

function ContextMenuItem({
  icon, label, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50"
    >
      {icon}
      {label}
    </button>
  );
}
