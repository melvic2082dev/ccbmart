'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, Users, Package, Award, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';

type Tab = 'ctv' | 'products' | 'members';

const TAB_CONFIG: Record<Tab, { label: string; icon: React.ReactNode; importFn: (fd: FormData) => Promise<any> }> = {
  ctv: { label: 'CTV', icon: <Users size={16} />, importFn: api.adminImportCtv },
  products: { label: 'San pham', icon: <Package size={16} />, importFn: api.adminImportProducts },
  members: { label: 'Thanh vien', icon: <Award size={16} />, importFn: api.adminImportMembers },
};

export default function AdminImport() {
  const [tab, setTab] = useState<Tab>('ctv');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await TAB_CONFIG[tab].importFn(fd);
      setResult(res);
      setFile(null);
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FileSpreadsheet size={24} /> Import du lieu</h2>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-1">
          {(Object.keys(TAB_CONFIG) as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setResult(null); setFile(null); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >{TAB_CONFIG[t].icon} {TAB_CONFIG[t].label}</button>
          ))}
        </div>
      </div>

      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle>Import {TAB_CONFIG[tab].label} tu Excel</CardTitle>
          <p className="text-sm text-muted-foreground">Tai file mau, dien du lieu, upload len he thong</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => api.adminDownloadTemplate(tab)} className="flex items-center gap-2">
              <Download size={16} /> Tai file mau (.xlsx)
            </Button>
          </div>

          {/* Upload */}
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" id="import-file" />
            <label htmlFor="import-file" className="cursor-pointer">
              <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{file ? file.name : 'Chon file Excel (.xlsx)'}</p>
            </label>
          </div>

          {file && (
            <Button onClick={handleImport} disabled={loading} className="w-full">
              {loading ? 'Dang import...' : `Import ${TAB_CONFIG[tab].label}`}
            </Button>
          )}

          {/* Results */}
          {result && !result.error && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-green-600"><CheckCircle size={18} /> Thanh cong: {result.success?.length || 0}</div>
                <div className="flex items-center gap-2 text-red-500"><XCircle size={18} /> That bai: {result.failed?.length || 0}</div>
                <div className="text-muted-foreground">Tong: {result.total || 0}</div>
              </div>
              {result.failed?.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Du lieu</TableHead><TableHead>Loi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {result.failed.map((f: any, i: number) => (
                      <TableRow key={i}><TableCell>{f.email || f.name || 'N/A'}</TableCell><TableCell className="text-red-500 text-sm">{f.error}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
          {result?.error && <div className="bg-red-50 dark:bg-red-500/10 text-red-600 p-3 rounded-xl text-sm">{result.error}</div>}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
