'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Users, Building2, Package, BarChart3, Pencil, Trash2, Plus, RotateCcw, Save, Check, X } from 'lucide-react';

type Tab = 'commission' | 'kpi' | 'agency' | 'cogs';

const RANK_LABELS: Record<string, string> = {
  CTV: 'Cong tac vien', PP: 'Pho phong KD', TP: 'Truong phong KD', GDV: 'Giam doc Vung', GDKD: 'Giam doc Kinh doanh'
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
  const [newComm, setNewComm] = useState({ tier: '', selfSalePct: 0, f1Pct: 0, f2Pct: 0, f3Pct: 0, fixedSalary: 0 });

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
        selfSalePct: commForm.selfSalePct, f1Pct: commForm.f1Pct, f2Pct: commForm.f2Pct, f3Pct: commForm.f3Pct, fixedSalary: commForm.fixedSalary
      });
      setEditingComm(null);
      await fetchAll();
      showToast('Da luu hoa hong ' + commForm.tier);
    } catch (e: any) { showToast('Loi: ' + e.message); }
    setSaving(false);
  };
  const deleteComm = async (tier: string) => {
    if (!confirm(`Xoa cap bac ${tier}?`)) return;
    try { await api.adminDeleteCommission(tier); await fetchAll(); showToast('Da xoa ' + tier); } catch (e: any) { showToast('Loi: ' + e.message); }
  };
  const addComm = async () => {
    if (!newComm.tier) return;
    setSaving(true);
    try { await api.adminCreateCommission(newComm); setAddingComm(false); setNewComm({ tier: '', selfSalePct: 0, f1Pct: 0, f2Pct: 0, f3Pct: 0, fixedSalary: 0 }); await fetchAll(); showToast('Da them cap bac ' + newComm.tier); } catch (e: any) { showToast('Loi: ' + e.message); }
    setSaving(false);
  };

  // KPI handlers
  const startEditKpi = (k: any) => { setEditingKpi(k.rank); setKpiForm({ ...k }); };
  const saveKpi = async () => {
    setSaving(true);
    try { await api.adminUpdateKpi(kpiForm.rank, { minSelfCombo: kpiForm.minSelfCombo, minPortfolio: kpiForm.minPortfolio, fallbackRank: kpiForm.fallbackRank }); setEditingKpi(null); await fetchAll(); showToast('Da luu KPI ' + kpiForm.rank); } catch (e: any) { showToast('Loi: ' + e.message); }
    setSaving(false);
  };

  // Agency handlers
  const startEditAgency = (a: any) => { setEditingAgency(a.group); setAgencyForm({ ...a }); };
  const saveAgency = async () => {
    setSaving(true);
    try { await api.adminUpdateAgency(agencyForm.group, { commissionPct: agencyForm.commissionPct, bonusPct: agencyForm.bonusPct }); setEditingAgency(null); await fetchAll(); showToast('Da luu nhom ' + agencyForm.group); } catch (e: any) { showToast('Loi: ' + e.message); }
    setSaving(false);
  };

  // COGS handlers
  const startEditCogs = (c: any) => { setEditingCogs(c.phase); setCogsForm({ ...c }); };
  const saveCogs = async () => {
    setSaving(true);
    try { await api.adminUpdateCogs(cogsForm.phase, { name: cogsForm.name, cogsPct: cogsForm.cogsPct, description: cogsForm.description }); setEditingCogs(null); await fetchAll(); showToast('Da luu COGS ' + cogsForm.phase); } catch (e: any) { showToast('Loi: ' + e.message); }
    setSaving(false);
  };

  const resetAll = async () => {
    if (!confirm('Dat lai tat ca cau hinh ve mac dinh? Hanh dong nay khong the hoan tac.')) return;
    setSaving(true);
    try { await api.adminResetConfig(); await fetchAll(); showToast('Da reset ve mac dinh'); } catch (e: any) { showToast('Loi: ' + e.message); }
    setSaving(false);
  };

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'commission', label: 'CTV Commission', icon: <Users size={16} /> },
    { key: 'kpi', label: 'KPI Rules', icon: <BarChart3 size={16} /> },
    { key: 'agency', label: 'Agency Commission', icon: <Building2 size={16} /> },
    { key: 'cogs', label: 'COGS Phases', icon: <Package size={16} /> },
  ];

  return (
    <DashboardLayout role="admin">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Settings size={24} /> Cau hinh he thong</h2>
        <Badge className="bg-indigo-100 text-indigo-700">Admin</Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
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
                <CardTitle className="flex items-center gap-2"><Users size={20} /> Hoa hong CTV theo cap bac</CardTitle>
                <p className="text-sm text-gray-500">Cascading: Tu ban + F1 + F2 + F3</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cap bac</TableHead>
                      <TableHead>Ten</TableHead>
                      <TableHead className="text-right">HH Tu ban</TableHead>
                      <TableHead className="text-right">F1</TableHead>
                      <TableHead className="text-right">F2</TableHead>
                      <TableHead className="text-right">F3</TableHead>
                      <TableHead className="text-right">Luong cung</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map(c => editingComm === c.tier ? (
                      <TableRow key={c.tier}>
                        <TableCell><Badge>{c.tier}</Badge></TableCell>
                        <TableCell>{RANK_LABELS[c.tier] || c.tier}</TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.selfSalePct} onChange={e => setCommForm({ ...commForm, selfSalePct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.f1Pct} onChange={e => setCommForm({ ...commForm, f1Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.f2Pct} onChange={e => setCommForm({ ...commForm, f2Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={commForm.f3Pct} onChange={e => setCommForm({ ...commForm, f3Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right inline-block" /></TableCell>
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
                        <TableCell className="text-right font-mono">{c.f1Pct > 0 ? pct(c.f1Pct) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{c.f2Pct > 0 ? pct(c.f2Pct) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{c.f3Pct > 0 ? pct(c.f3Pct) : '-'}</TableCell>
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
                        <TableCell className="text-sm text-gray-400">Cap bac moi</TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.selfSalePct} onChange={e => setNewComm({ ...newComm, selfSalePct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.f1Pct} onChange={e => setNewComm({ ...newComm, f1Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.f2Pct} onChange={e => setNewComm({ ...newComm, f2Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" min={0} max={1} step={0.01} value={newComm.f3Pct} onChange={e => setNewComm({ ...newComm, f3Pct: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
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
                    <Button variant="outline" size="sm" onClick={() => setAddingComm(true)} className="flex items-center gap-1"><Plus size={14} /> Them cap bac moi</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 2: KPI */}
          {tab === 'kpi' && (
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 size={20} /> Dieu kien duy tri chuc danh (KPI)</CardTitle>
                <p className="text-sm text-gray-500">Combo = 2,000,000 VND | Danh gia moi thang</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cap</TableHead>
                      <TableHead className="text-right">Tu ban (combo/thang)</TableHead>
                      <TableHead className="text-right">Portfolio toi thieu</TableHead>
                      <TableHead>Neu khong dat</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
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
                            <option value="CTV">Giam xuong CTV</option>
                            <option value="PP">Giam xuong PP</option>
                            <option value="TP">Giam xuong TP</option>
                            <option value="GDV">Giam xuong GDV</option>
                            <option value="LOCK">Khoa tai khoan</option>
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
                        <TableCell className="text-right font-mono">{k.minSelfCombo > 0 ? `>= ${k.minSelfCombo}` : 'Khong bat buoc'}</TableCell>
                        <TableCell className="text-right font-mono">{k.minPortfolio > 0 ? `>= ${k.minPortfolio}` : '-'}</TableCell>
                        <TableCell className={k.fallbackRank === 'LOCK' ? 'text-red-600' : 'text-orange-600'}>{k.fallbackRank === 'LOCK' ? 'Khoa tai khoan' : `Giam xuong ${k.fallbackRank}`}</TableCell>
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
                <CardTitle className="flex items-center gap-2"><Building2 size={20} /> Hoa hong Dai ly theo nhom</CardTitle>
                <p className="text-sm text-gray-500">Toi da 30% (hoa hong + thuong)</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhom</TableHead>
                      <TableHead>Mo ta</TableHead>
                      <TableHead className="text-right">Hoa hong</TableHead>
                      <TableHead className="text-right">Thuong</TableHead>
                      <TableHead className="text-right">Tong</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencies.map(a => editingAgency === a.group ? (
                      <TableRow key={a.group}>
                        <TableCell><Badge>{a.group}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-500">{a.group === 'A' ? 'Thiet yeu (Nong san)' : a.group === 'B' ? 'Core (FMCG, gia vi)' : 'Loi nhuan cao (TPCN, combo)'}</TableCell>
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
                        <TableCell className="text-sm">{a.group === 'A' ? 'Thiet yeu (Nong san)' : a.group === 'B' ? 'Core (FMCG, gia vi)' : 'Loi nhuan cao (TPCN, combo)'}</TableCell>
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
                <CardTitle className="flex items-center gap-2"><Package size={20} /> COGS theo giai doan</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Giai doan</TableHead>
                      <TableHead>Ten</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead>Mo ta</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
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

          {/* Footer actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={resetAll} disabled={saving} className="flex items-center gap-1">
              <RotateCcw size={14} /> Dat lai mac dinh
            </Button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
