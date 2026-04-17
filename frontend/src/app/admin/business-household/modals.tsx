'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, FileText, RefreshCw, Landmark } from 'lucide-react';

export interface HouseholdRow {
  id: number;
  userId: number;
  businessName: string;
  taxCode: string | null;
  businessLicense: string | null;
  registeredAt: string;
  status: string;
  dealerContractNo?: string | null;
  dealerSignedAt?: string | null;
  dealerExpiredAt?: string | null;
  dealerTermMonths?: number | null;
  dealerPdfUrl?: string | null;
  trainingContractNo?: string | null;
  trainingSignedAt?: string | null;
  trainingExpiredAt?: string | null;
  trainingTermMonths?: number | null;
  trainingPdfUrl?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountHolder?: string | null;
  trainingLineRegistered?: boolean;
  warnings?: Array<{ type: string; severity: string; label: string }>;
  user: { id: number; name: string; email: string; phone: string; rank: string; isActive: boolean };
}

export function HkdWarningBadges({ warnings }: { warnings?: HouseholdRow['warnings'] }) {
  if (!warnings || warnings.length === 0) {
    return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs">OK</Badge>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {warnings.map((w, i) => {
        const cls =
          w.severity === 'red' ? 'bg-red-100 text-red-700 border border-red-300' :
          w.severity === 'amber' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
          w.severity === 'orange' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
          'bg-yellow-100 text-yellow-700 border border-yellow-300';
        return <Badge key={i} className={`text-xs ${cls}`} title={w.label}>{w.label}</Badge>;
      })}
    </div>
  );
}

// ============================================================
// HKD detail modal
// ============================================================
interface DetailData {
  hkd: HouseholdRow;
  trainingPayments: Array<{ month: string; fixedFee: number; poolFee: number; total: number; status: string }>;
  totalReceived12m: number;
  b2bContracts: Array<{ id: number; contractNo: string; signedAt: string; expiredAt?: string | null; status: string; trainer: { name: string; rank: string }; trainee: { name: string; rank: string } }>;
}

export function HkdDetailModal({
  open, onOpenChange, hkdId, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hkdId: number | null;
  onChanged: () => void;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [openRenew, setOpenRenew] = useState<null | 'dealer' | 'training'>(null);
  const [openBank, setOpenBank] = useState(false);

  useEffect(() => {
    if (!open || !hkdId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setData(null);
    api.adminBusinessHouseholdDetails(hkdId)
      .then((d) => { if (!cancelled) setData(d as DetailData); })
      .catch((err) => console.error('Failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, hkdId]);

  const reload = () => {
    if (!hkdId) return;
    api.adminBusinessHouseholdDetails(hkdId).then((d) => setData(d as DetailData));
    onChanged();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết HKD {data ? `· ${data.hkd.businessName}` : ''}</DialogTitle>
            {data && (
              <DialogDescription>
                Chủ: {data.hkd.user.name} ({data.hkd.user.rank}) · MST: {data.hkd.taxCode || '—'}
              </DialogDescription>
            )}
          </DialogHeader>

          {loading || !data ? (
            <div className="py-10 text-center text-sm text-gray-400">Đang tải…</div>
          ) : (
            <Tabs defaultValue="profile" className="mt-2">
              <TabsList>
                <TabsTrigger value="profile">Thông tin & hợp đồng</TabsTrigger>
                <TabsTrigger value="fees">Phí đào tạo ({data.trainingPayments.length})</TabsTrigger>
                <TabsTrigger value="contracts">HĐ B2B ({data.b2bContracts.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="pt-4 space-y-4">
                {/* Contract info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ContractCard
                    title="HĐ Đại lý bán lẻ"
                    contractNo={data.hkd.dealerContractNo}
                    signedAt={data.hkd.dealerSignedAt}
                    expiredAt={data.hkd.dealerExpiredAt}
                    termMonths={data.hkd.dealerTermMonths}
                    pdfUrl={data.hkd.dealerPdfUrl}
                    onRenew={() => setOpenRenew('dealer')}
                  />
                  <ContractCard
                    title="HĐ Dịch vụ đào tạo"
                    contractNo={data.hkd.trainingContractNo}
                    signedAt={data.hkd.trainingSignedAt}
                    expiredAt={data.hkd.trainingExpiredAt}
                    termMonths={data.hkd.trainingTermMonths}
                    pdfUrl={data.hkd.trainingPdfUrl}
                    onRenew={() => setOpenRenew('training')}
                  />
                </div>

                {/* Bank info */}
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold flex items-center gap-1">
                      <Landmark className="w-4 h-4 text-blue-600" /> Tài khoản ngân hàng
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setOpenBank(true)}>
                      {data.hkd.bankAccountNo ? 'Cập nhật' : 'Thêm mới'}
                    </Button>
                  </div>
                  {!data.hkd.bankAccountNo ? (
                    <p className="text-sm text-amber-700">⚠️ Chưa cập nhật — CCB Mart chưa thể chi trả phí DV đào tạo</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs uppercase text-gray-400">Ngân hàng</p>
                        <p className="font-medium">{data.hkd.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-400">Số TK</p>
                        <p className="font-mono">{data.hkd.bankAccountNo}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-400">Chủ TK</p>
                        <p className="font-medium">{data.hkd.bankAccountHolder}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legal */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-xs uppercase text-gray-400">Mã số thuế</p>
                    <p className="font-mono font-medium">{data.hkd.taxCode || '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs uppercase text-gray-400">Giấy phép KD</p>
                    <p className="font-medium">{data.hkd.businessLicense || '—'}</p>
                    <p className="mt-1 text-xs">
                      {data.hkd.trainingLineRegistered
                        ? <span className="text-emerald-700">✓ Đã đăng ký ngành đào tạo</span>
                        : <span className="text-orange-700">⚠️ Chưa đăng ký ngành đào tạo (Mã 8559 — tư vấn đào tạo)</span>}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Training payments */}
              <TabsContent value="fees" className="pt-4 space-y-3">
                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900">
                  Tổng phí DV đào tạo đã nhận 12 tháng: <b>{formatVND(data.totalReceived12m)}</b>
                </div>
                {data.trainingPayments.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">Chưa có khoản chi trả nào</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tháng</TableHead>
                        <TableHead className="text-right">Phí cố định (M0–M5)</TableHead>
                        <TableHead className="text-right">Phí quản lý (F1/F2/F3)</TableHead>
                        <TableHead className="text-right">Tổng</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.trainingPayments.map(r => (
                        <TableRow key={r.month}>
                          <TableCell className="font-medium">{r.month}</TableCell>
                          <TableCell className="text-right">{formatVND(r.fixedFee)}</TableCell>
                          <TableCell className="text-right">{formatVND(r.poolFee)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatVND(r.total)}</TableCell>
                          <TableCell>
                            <Badge className={r.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700 text-xs'
                              : 'bg-amber-100 text-amber-700 text-xs'}>{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="contracts" className="pt-4">
                {data.b2bContracts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">Chưa có hợp đồng B2B</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã HĐ</TableHead>
                        <TableHead>Trainer</TableHead>
                        <TableHead>Trainee</TableHead>
                        <TableHead>Ngày ký</TableHead>
                        <TableHead>Hết hạn</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.b2bContracts.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.contractNo}</TableCell>
                          <TableCell className="text-xs">{c.trainer.name} ({c.trainer.rank})</TableCell>
                          <TableCell className="text-xs">{c.trainee.name} ({c.trainee.rank})</TableCell>
                          <TableCell className="text-xs">{new Date(c.signedAt).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell className="text-xs">{c.expiredAt ? new Date(c.expiredAt).toLocaleDateString('vi-VN') : '—'}</TableCell>
                          <TableCell>
                            <Badge className={c.status === 'active' ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-gray-100 text-gray-600 text-xs'}>{c.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew contract sub-dialog */}
      {openRenew && hkdId && (
        <RenewContractDialog
          hkdId={hkdId}
          kind={openRenew}
          onClose={() => setOpenRenew(null)}
          onSuccess={() => { setOpenRenew(null); reload(); }}
        />
      )}

      {/* Update bank sub-dialog */}
      {openBank && hkdId && data?.hkd && (
        <UpdateBankDialog
          hkdId={hkdId}
          current={data.hkd}
          onClose={() => setOpenBank(false)}
          onSuccess={() => { setOpenBank(false); reload(); }}
        />
      )}
    </>
  );
}

function ContractCard({
  title, contractNo, signedAt, expiredAt, termMonths, pdfUrl, onRenew,
}: {
  title: string;
  contractNo?: string | null;
  signedAt?: string | null;
  expiredAt?: string | null;
  termMonths?: number | null;
  pdfUrl?: string | null;
  onRenew: () => void;
}) {
  // Side-effect Date.now() is fine here — rendered value depends on real time for freshness
  // eslint-disable-next-line react-hooks/purity
  const daysLeft = expiredAt ? Math.ceil((new Date(expiredAt).getTime() - Date.now()) / 86400000) : null;
  const statusText = daysLeft === null ? 'Không có' :
                     daysLeft < 0 ? `Đã hết hạn ${-daysLeft} ngày` :
                     daysLeft <= 30 ? `Còn ${daysLeft} ngày` : `Còn ${daysLeft} ngày`;
  const statusColor = daysLeft === null ? 'text-gray-400' :
                      daysLeft < 0 ? 'text-red-600' :
                      daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold flex items-center gap-1">
          <FileText className="w-4 h-4 text-gray-600" /> {title}
        </p>
        <Button variant="outline" size="sm" onClick={onRenew}>
          <RefreshCw className="w-3 h-3 mr-1" /> Gia hạn
        </Button>
      </div>
      <div className="space-y-1 text-xs">
        <p><span className="text-gray-400">Số HĐ:</span> <span className="font-mono">{contractNo || '—'}</span></p>
        <p><span className="text-gray-400">Ngày ký:</span> {signedAt ? new Date(signedAt).toLocaleDateString('vi-VN') : '—'}</p>
        <p><span className="text-gray-400">Thời hạn:</span> {termMonths ? `${termMonths} tháng` : '—'}</p>
        <p><span className="text-gray-400">Hết hạn:</span> {expiredAt ? new Date(expiredAt).toLocaleDateString('vi-VN') : '—'} · <span className={statusColor}>{statusText}</span></p>
        {pdfUrl && (
          <p className="pt-1">
            <a href={pdfUrl} className="text-blue-600 hover:underline inline-flex items-center gap-1" target="_blank" rel="noopener">
              <Download className="w-3 h-3" /> Tải HĐ đã ký
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function RenewContractDialog({
  hkdId, kind, onClose, onSuccess,
}: {
  hkdId: number;
  kind: 'dealer' | 'training';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [termMonths, setTermMonths] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.adminBusinessHouseholdRenew(hkdId, kind, termMonths);
      onSuccess();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const label = kind === 'dealer' ? 'HĐ Đại lý bán lẻ' : 'HĐ Dịch vụ đào tạo';
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gia hạn {label}</DialogTitle>
          <DialogDescription>Ngày ký mới = hôm nay, ngày hết hạn = hôm nay + thời hạn mới</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="term">Thời hạn mới (tháng)</Label>
          <select
            id="term"
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {[6, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} tháng</option>)}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Đang lưu…' : 'Gia hạn'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateBankDialog({
  hkdId, current, onClose, onSuccess,
}: {
  hkdId: number;
  current: HouseholdRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bankName, setBankName] = useState(current.bankName || '');
  const [bankAccountNo, setBankAccountNo] = useState(current.bankAccountNo || '');
  const [bankAccountHolder, setBankAccountHolder] = useState(current.bankAccountHolder || '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.adminBusinessHouseholdUpdateBank(hkdId, bankName, bankAccountNo, bankAccountHolder);
      onSuccess();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cập nhật tài khoản ngân hàng</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="bank-name">Tên ngân hàng</Label>
            <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Vietcombank" />
          </div>
          <div>
            <Label htmlFor="bank-acc">Số tài khoản</Label>
            <Input id="bank-acc" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bank-holder">Chủ tài khoản</Label>
            <Input id="bank-holder" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())} placeholder="IN HOA, KHÔNG DẤU" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Huỷ</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Đang lưu…' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
