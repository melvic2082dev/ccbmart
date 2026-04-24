'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Users, Building2, Package, BarChart3, Pencil, Trash2, Plus, RotateCcw, Check, X, Scale, Calculator } from 'lucide-react';

type Tab = 'commission' | 'kpi' | 'agency' | 'cogs' | 'promotion' | 'softSalary';

const RANK_LABELS: Record<string, string> = {
  CTV: 'Cộng tác viên', PP: 'Phó phòng KD', TP: 'Trưởng phòng KD', GDV: 'Giám đốc Vùng', GDKD: 'Giám đốc Kinh doanh'
};

export default function AdminConfig() {
  const [tab, setTab] = useState<Tab>('commission');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Commission state
  const [commissions, setCommissions] = useState<any[]>([]);
  const [editingComm, setEditingComm] = useState<string | null>(null);
  const [commForm, setCommForm] = useState<any>({});
  const [addingComm, setAddingComm] = useState(false);
  const [newComm, setNewComm] = useState({ tier: '', selfSalePct: 0, directPct: 0, indirect2Pct: 0, indirect3Pct: 0, fixedSalary: 0 });

  // KPI state
  const [kpis, setKpis] = useState<any[]>([]);
  const [editingKpi, setEditingKpi] = useState<string | null>(null);
  const [kpiForm, setKpiForm] = useState<any>({});

  // Agency state
  const [agencies, setAgencies] = useState<any[]>([]);
  const [editingAgency, setEditingAgency] = useState<string | null>(null);
  const [agencyForm, setAgencyForm] = useState<any>({});

  // COGS state
  const [cogs, setCogs] = useState<any[]>([]);
  const [editingCogs, setEditingCogs] = useState<string | null>(null);
  const [cogsForm, setCogsForm] = useState<any>({});

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [commData, kpiData, agencyData, cogsData] = await Promise.all([
        api.adminCommissionConfig(),
        api.adminKpiConfig(),
        api.adminAgencyConfig(),
        api.adminCogsConfig(),
      ]);
      setCommissions(commData.ctvConfig || []);
      setKpis(kpiData || []);
      setAgencies(agencyData || []);
      setCogs(cogsData || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Commission handlers
  const startEditComm = (c: any) => { setEditingComm(c.tier); setCommForm({ ...c }); };
  const cancelEditComm = () => { setEditingComm(null); setCommForm({}); };
  const saveComm = async () => {
    setSaving(true);
    try {
      await api.adminUpdateCommission(commForm.tier, {
        selfSalePct: commForm.selfSalePct, directPct: commForm.directPct, indirect2Pct: commForm.indirect2Pct, indirect3Pct: commForm.indirect3Pct, fixedSalary: commForm.fixedSalary
      });
      setEditingComm(null);
      await fetchAll();
      showToast('Đã lưu hoa hồng ' + commForm.tier);
    } catch (e: any) { showToast('Lỗi: ' + e.message); }
    setSaving(false);
  };
  const deleteComm = async (tier: string) => {
    if (!confirm(`Xóa cấp bậc ${tier}?`)) return;
    try { await api.adminDeleteCommission(tier); await fetchAll(); showToast('Đã xóa ' + tier); } catch (e: any) { showToast('Lỗi: ' + e.message); }
  };
  const addComm = async () => {
    if (!newComm.tier) return;
    setSaving(true);
    try { await api.adminCreateCommission(newComm); setAddingComm(false); setNewComm({ tier: '', selfSalePct: 0, directPct: 0, indirect2Pct: 0, indirect3Pct: 0, fixedSalary: 0 }); await fetchAll(); showToast('Đã thêm cấp bậc ' + newComm.tier); } catch (e: any) { showToast('Lỗi: ' + e.message); }
    setSaving(false);
  };

  // KPI handlers
  const startEditKpi = (k: any) => { setEditingKpi(k.rank); setKpiForm({ ...k }); };
  const saveKpi = async () => {
    setSaving(true);
    try { await api.adminUpdateKpi(kpiForm.rank, { minSelfCombo: kpiForm.minSelfCombo, minPortfolio: kpiForm.minPortfolio, fallbackRank: kpiForm.fallbackRank }); setEditingKpi(null); await fetchAll(); showToast('Đã lưu KPI ' + kpiForm.rank); } catch (e: any) { showToast('Lỗi: ' + e.message); }
    setSaving(false);
  };

  // Agency handlers
  const startEditAgency = (a: any) => { setEditingAgency(a.group); setAgencyForm({ ...a }); };
  const saveAgency = async () => {
    setSaving(true);
    try { await api.adminUpdateAgency(agencyForm.group, { commissionPct: agencyForm.commissionPct, bonusPct: agencyForm.bonusPct }); setEditingAgency(null); await fetchAll(); showToast('Đã lưu nhóm ' + agencyForm.group); } catch (e: any) { showToast('Lỗi: ' + e.message); }
    setSaving(false);
  };

  // COGS handlers
  const startEditCogs = (c: any) => { setEditingCogs(c.phase); setCogsForm({ ...c }); };
  const saveCogs = async () => {
    setSaving(true);
    try { await api.adminUpdateCogs(cogsForm.phase, { name: cogsForm.name, cogsPct: cogsForm.cogsPct, description: cogsForm.description }); setEditingCogs(null); await fetchAll(); showToast('Đã lưu COGS ' + cogsForm.phase); } catch (e: any) { showToast('Lỗi: ' + e.message); }
    setSaving(false);
  };

  const resetAll = async () => {
    if (!confirm('Đặt lại tất cả cấu hình về mặc định? Hành động này không thể hoàn tác.')) return;
    setSaving(true);
    try { await api.adminResetConfig(); await fetchAll(); showToast('Đã reset về mặc định'); } catch (e: any) { showToast('Lỗi: ' + e.message); }
    setSaving(false);
  };

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'commission', label: 'Hoa hồng CTV', icon: <Users size={16} /> },
    { key: 'kpi', label: 'Quy tắc KPI', icon: <BarChart3 size={16} /> },
    { key: 'agency', label: 'Hoa hồng Đại lý', icon: <Building2 size={16} /> },
    { key: 'cogs', label: 'Giai đoạn COGS', icon: <Package size={16} /> },
    { key: 'promotion', label: 'Thăng tiến', icon: <Scale size={16} /> },
    { key: 'softSalary', label: 'Ngưỡng lương mềm', icon: <Calculator size={16} /> },
  ];

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-in fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Settings size={24} /> Cấu hình hệ thống</h2>
        <Badge className="bg-indigo-100 text-indigo-700">Admin</Badge>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-xl" />)}</div>
      ) : (
        <>
          {/* Tab 1: CTV Commission */}
          {tab === 'commission' && (
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users size={20} /> Hoa hồng CTV theo cấp bậc</CardTitle>
                <p className="text-sm text-gray-500">Cascading: Tự bán + Trực tiếp + Gián tiếp cấp 2 + Gián tiếp cấp 3</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cấp bậc</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="text-right">HH Tự bán</TableHead>
                      <TableHead className="text-right">Trực tiếp</TableHead>
                      <TableHead className="text-right">GT cấp 2</TableHead>
                      <TableHead className="text-right">GT cấp 3</TableHead>
                      <TableHead className="text-right">Lương cứng</TableHead>
                      <TableHead className="text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map(c => editingComm === c.tier ? (
                      <TableRow key={c.tier}>
                        <TableCell><Badge>{c.tier}</Badge></TableCell>
                        <TableCell>{RANK_LABELS[c.tier] || c.tier}</TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.selfSalePct} onChange={e => setCommForm({ ...commForm, selfSalePct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.directPct} onChange={e => setCommForm({ ...commForm, directPct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.indirect2Pct} onChange={e => setCommForm({ ...commForm, indirect2Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.indirect3Pct} onChange={e => setCommForm({ ...commForm, indirect3Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} step={1000000} value={commForm.fixedSalary} onChange={e => setCommForm({ ...commForm, fixedSalary: parseInt(e.target.value) || 0 })} className="w-28 text-right inline-block" /></TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" onClick={saveComm} disabled={saving}><Check size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditComm}><X size={14} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={c.tier}>
                        <TableCell><Badge variant={c.tier === 'GDKD' ? 'default' : 'secondary'}>{c.tier}</Badge></TableCell>
                        <TableCell className="font-medium">{RANK_LABELS[c.tier] || c.tier}</TableCell>
                        <TableCell className="text-right font-mono">{pct(c.selfSalePct)}</TableCell>
                        <TableCell className="text-right font-mono">{c.directPct > 0 ? pct(c.directPct) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{c.indirect2Pct > 0 ? pct(c.indirect2Pct) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{c.indirect3Pct > 0 ? pct(c.indirect3Pct) : '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{c.fixedSalary > 0 ? formatVND(c.fixedSalary) : '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="ghost" onClick={() => startEditComm(c)}><Pencil size={14} /></Button>
                            {!['CTV', 'GDKD'].includes(c.tier) && (
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteComm(c.tier)}><Trash2 size={14} /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {addingComm && (
                      <TableRow>
                        <TableCell><Input value={newComm.tier} onChange={e => setNewComm({ ...newComm, tier: e.target.value.toUpperCase() })} placeholder="VD: DT" className="w-20" /></TableCell>
                        <TableCell className="text-sm text-gray-400">Cấp bậc mới</TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.selfSalePct} onChange={e => setNewComm({ ...newComm, selfSalePct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.directPct} onChange={e => setNewComm({ ...newComm, directPct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.indirect2Pct} onChange={e => setNewComm({ ...newComm, indirect2Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.indirect3Pct} onChange={e => setNewComm({ ...newComm, indirect3Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} step={1000000} value={newComm.fixedSalary} onChange={e => setNewComm({ ...newComm, fixedSalary: parseInt(e.target.value) || 0 })} className="w-28 text-right" /></TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" onClick={addComm} disabled={saving || !newComm.tier}><Check size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingComm(false)}><X size={14} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {!addingComm && (
                  <div className="p-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setAddingComm(true)} className="flex items-center gap-1"><Plus size={14} /> Thêm cấp bậc mới</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 2: KPI */}
          {tab === 'kpi' && (
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 size={20} /> Điều kiện duy trì chức danh (KPI)</CardTitle>
                <p className="text-sm text-gray-500">Combo = 2,000,000 VND · Đánh giá mỗi tháng</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cấp</TableHead>
                      <TableHead className="text-right">Tự bán (combo/tháng)</TableHead>
                      <TableHead className="text-right">Portfolio tối thiểu</TableHead>
                      <TableHead>Nếu không đạt</TableHead>
                      <TableHead className="text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.map(k => editingKpi === k.rank ? (
                      <TableRow key={k.rank}>
                        <TableCell><Badge>{k.rank}</Badge></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} value={kpiForm.minSelfCombo} onChange={e => setKpiForm({ ...kpiForm, minSelfCombo: parseInt(e.target.value) || 0 })} className="w-24 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} value={kpiForm.minPortfolio} onChange={e => setKpiForm({ ...kpiForm, minPortfolio: parseInt(e.target.value) || 0 })} className="w-24 text-right inline-block" /></TableCell>
                        <TableCell>
                          <select value={kpiForm.fallbackRank} onChange={e => setKpiForm({ ...kpiForm, fallbackRank: e.target.value })} className="border rounded-lg px-2 py-1 text-sm">
                            <option value="CTV">Giảm xuống CTV</option>
                            <option value="PP">Giảm xuống PP</option>
                            <option value="TP">Giảm xuống TP</option>
                            <option value="GDV">Giảm xuống GDV</option>
                            <option value="LOCK">Khóa tài khoản</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" onClick={saveKpi} disabled={saving}><Check size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingKpi(null)}><X size={14} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={k.rank}>
                        <TableCell><Badge variant="outline">{k.rank}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{k.minSelfCombo > 0 ? `≥ ${k.minSelfCombo}` : 'Không bắt buộc'}</TableCell>
                        <TableCell className="text-right font-mono">{k.minPortfolio > 0 ? `≥ ${k.minPortfolio}` : '-'}</TableCell>
                        <TableCell className={k.fallbackRank === 'LOCK' ? 'text-red-600' : 'text-orange-600'}>{k.fallbackRank === 'LOCK' ? 'Khóa tài khoản' : `Giảm xuống ${k.fallbackRank}`}</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" onClick={() => startEditKpi(k)}><Pencil size={14} /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Agency */}
          {tab === 'agency' && (
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 size={20} /> Hoa hồng Đại lý theo nhóm</CardTitle>
                <p className="text-sm text-gray-500">Tối đa 30% (hoa hồng + thưởng)</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhóm</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-right">Hoa hồng</TableHead>
                      <TableHead className="text-right">Thưởng</TableHead>
                      <TableHead className="text-right">Tổng</TableHead>
                      <TableHead className="text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencies.map(a => editingAgency === a.group ? (
                      <TableRow key={a.group}>
                        <TableCell><Badge>{a.group}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-500">{a.group === 'A' ? 'Thiết yếu (Nông sản)' : a.group === 'B' ? 'Core (FMCG, gia vị)' : 'Lợi nhuận cao (TPCN, combo)'}</TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={0.30} step={0.01} value={agencyForm.commissionPct} onChange={e => setAgencyForm({ ...agencyForm, commissionPct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={0.10} step={0.01} value={agencyForm.bonusPct} onChange={e => setAgencyForm({ ...agencyForm, bonusPct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right font-semibold">{pct((agencyForm.commissionPct || 0) + (agencyForm.bonusPct || 0))}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" onClick={saveAgency} disabled={saving}><Check size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingAgency(null)}><X size={14} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={a.group}>
                        <TableCell><Badge>{a.group}</Badge></TableCell>
                        <TableCell className="text-sm">{a.group === 'A' ? 'Thiết yếu (Nông sản)' : a.group === 'B' ? 'Core (FMCG, gia vị)' : 'Lợi nhuận cao (TPCN, combo)'}</TableCell>
                        <TableCell className="text-right font-mono">{pct(a.commissionPct)}</TableCell>
                        <TableCell className="text-right font-mono">{pct(a.bonusPct)}</TableCell>
                        <TableCell className="text-right font-semibold">{pct(a.commissionPct + a.bonusPct)}</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" onClick={() => startEditAgency(a)}><Pencil size={14} /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tab 4: COGS */}
          {tab === 'cogs' && (
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package size={20} /> COGS theo giai đoạn</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Giai đoạn</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cogs.map(c => editingCogs === c.phase ? (
                      <TableRow key={c.phase}>
                        <TableCell><Badge variant="outline">{c.phase}</Badge></TableCell>
                        <TableCell><Input value={cogsForm.name} onChange={e => setCogsForm({ ...cogsForm, name: e.target.value })} className="w-40" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={cogsForm.cogsPct} onChange={e => setCogsForm({ ...cogsForm, cogsPct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell><Input value={cogsForm.description || ''} onChange={e => setCogsForm({ ...cogsForm, description: e.target.value })} className="w-48" /></TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" onClick={saveCogs} disabled={saving}><Check size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingCogs(null)}><X size={14} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={c.phase}>
                        <TableCell><Badge variant="outline">{c.phase}</Badge></TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{pct(c.cogsPct)}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.description}</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" onClick={() => startEditCogs(c)}><Pencil size={14} /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tab 5: Promotion T+1 conditions */}
          {tab === 'promotion' && (
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Scale size={20} /> Điều kiện thăng tiến T+1</CardTitle>
                <p className="text-sm text-gray-500">Đạt điều kiện tháng T, hiệu lực ngày 01 tháng T+1</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Từ</TableHead>
                      <TableHead>Lên</TableHead>
                      <TableHead>Điều kiện</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><Badge variant="outline">CTV</Badge></TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700">PP</Badge></TableCell>
                      <TableCell>5 thành viên trực tiếp đạt &ge;10 combo/người</TableCell>
                      <TableCell className="text-sm text-gray-500">Bảo trợ và dẫn dắt đội nhóm</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">PP</Badge></TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700">TP</Badge></TableCell>
                      <TableCell>3 PP do mình dẫn dắt + doanh số nhóm &ge;500 triệu</TableCell>
                      <TableCell className="text-sm text-gray-500">Xây dựng đội ngũ quản lý</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">TP</Badge></TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700">GDV</Badge></TableCell>
                      <TableCell>5 TP + doanh số nhóm &ge;2 tỷ</TableCell>
                      <TableCell className="text-sm text-gray-500">Quản lý vùng</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">GDV</Badge></TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700">GDKD</Badge></TableCell>
                      <TableCell>3 GDV + doanh số nhóm &ge;5 tỷ</TableCell>
                      <TableCell className="text-sm text-gray-500">Cần HĐQT duyệt</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tab 6: Soft Salary thresholds */}
          {tab === 'softSalary' && (
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator size={20} /> Ngưỡng Soft Salary</CardTitle>
                <p className="text-sm text-gray-500">Quỹ lương = 5% doanh thu kênh CTV</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mức sử dụng quỹ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Điều chỉnh</TableHead>
                      <TableHead>Mô tả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono">&lt; 100%</TableCell>
                      <TableCell><Badge className="bg-green-100 text-green-700">Bình thường</Badge></TableCell>
                      <TableCell>Hệ số 1.0 · trả đủ lương cứng</TableCell>
                      <TableCell className="text-sm text-gray-500">Không cần điều chỉnh</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono">100% - 120%</TableCell>
                      <TableCell><Badge className="bg-yellow-100 text-yellow-700">Cảnh báo</Badge></TableCell>
                      <TableCell>Người mới nhất: 50% cứng + 50% biến đổi</TableCell>
                      <TableCell className="text-sm text-gray-500">Lương biến đổi = DT cá nhân × 2% × hệ số</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono">120% - 150%</TableCell>
                      <TableCell><Badge className="bg-orange-100 text-orange-700">Cao</Badge></TableCell>
                      <TableCell>Người mới nhất: 30% cứng + 70% biến đổi</TableCell>
                      <TableCell className="text-sm text-gray-500">Lương biến đổi = DT cá nhân × 2% × hệ số</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono">&gt; 150%</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Đóng băng</Badge></TableCell>
                      <TableCell>Tạm dừng bổ nhiệm quản lý mới</TableCell>
                      <TableCell className="text-sm text-gray-500">Người mới nhất: 30% cứng + 70% biến đổi</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={resetAll} disabled={saving} className="flex items-center gap-1">
              <RotateCcw size={14} /> Đặt lại mặc định
            </Button>
          </div>
        </>
      )}
    </>
  );
}
