'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, getUser } from '@/lib/api';
import { canAccessMenu } from '@/lib/permissions';
import { CATEGORIES, PRODUCTS } from '@/components/landing/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Upload, Plus, Save, X, Search, Pencil } from 'lucide-react';

// Backend serves /uploads/cms/* on the API origin — convert relative to absolute for <Image>
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

function absoluteUrl(maybeRelative: string | null | undefined): string | null {
  if (!maybeRelative) return null;
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  return `${API_ORIGIN}${maybeRelative}`;
}

const TRUST_ICON_OPTIONS = [
  'ShieldCheck', 'Truck', 'RefreshCcw', 'HandHeart', 'Award', 'Wallet',
  'Coffee', 'Wheat', 'MapPin', 'Star', 'Gift', 'BookOpen',
];

type Hero = {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string | null;
  secondaryCtaHref: string | null;
  stat1Value: string; stat1Label: string;
  stat2Value: string; stat2Label: string;
  stat3Value: string; stat3Label: string;
  isActive: boolean;
};
type Promo = {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  endDate: string | null;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string | null;
  secondaryCtaHref: string | null;
  isActive: boolean;
};
type TrustItem = {
  id: number; title: string; subtitle: string; iconName: string;
  displayOrder: number; isActive: boolean;
};
type FeaturedProduct = {
  id: number; section: 'featured' | 'deals'; productSlug: string;
  displayOrder: number; isActive: boolean;
};

type WhyUs = {
  id: number;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string | null;
  isActive: boolean;
};

type CmsResponse = {
  hero: Hero;
  promo: Promo;
  whyUs: WhyUs;
  trustItems: TrustItem[];
  featured: FeaturedProduct[];
};

export default function AdminLandingCmsPage() {
  const router = useRouter();
  const [data, setData] = useState<CmsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [tab, setTab] = useState<'hero' | 'promo' | 'whyUs' | 'trust' | 'featured' | 'catalog' | 'categories' | 'community' | 'fund' | 'testimonials'>('hero');

  useEffect(() => {
    const u = getUser();
    if (!u || !canAccessMenu(u.role, '/admin/landing-cms')) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  // `silent` skips the page-level spinner so post-save refetches don't unmount the tab.
  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    api.adminLandingCms()
      .then((res) => setData(res))
      .catch((e) => setError(e?.message || 'Không tải được'))
      .finally(() => { if (!silent) setLoading(false); });
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);
  const refresh = () => load(true);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const flash = (kind: 'ok' | 'err', msg: string) => setToast({ kind, msg });

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Đang tải…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Lỗi: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold">Trang chủ CMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chỉnh sửa nội dung trang chủ landing — Hero, Promo Banner, Trust Items, Sản phẩm nổi bật.
        </p>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg text-sm font-medium
          ${toast.kind === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
        >
          {toast.msg}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="whyUs">Tại sao</TabsTrigger>
          <TabsTrigger value="trust">Giá trị cốt lõi</TabsTrigger>
          <TabsTrigger value="featured">Sản phẩm nổi bật</TabsTrigger>
          <TabsTrigger value="community">Hành trình kết nối</TabsTrigger>
          <TabsTrigger value="fund">Quỹ Vì đồng đội</TabsTrigger>
          <TabsTrigger value="testimonials">Tiếng nói chiến hữu</TabsTrigger>
          <TabsTrigger value="promo">Promo Banner</TabsTrigger>
          <TabsTrigger value="catalog">Catalog sản phẩm</TabsTrigger>
          <TabsTrigger value="categories">Danh mục</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <HeroEditor hero={data.hero} onSaved={(h) => { setData({ ...data, hero: h }); flash('ok', 'Đã lưu Hero'); }} onError={(m) => flash('err', m)} />
        </TabsContent>

        <TabsContent value="whyUs">
          <WhyUsEditor whyUs={data.whyUs} onSaved={(w) => { setData({ ...data, whyUs: w }); flash('ok', 'Đã lưu khối Tại sao'); }} onError={(m) => flash('err', m)} />
        </TabsContent>

        <TabsContent value="promo">
          <PromoEditor promo={data.promo} onSaved={(p) => { setData({ ...data, promo: p }); flash('ok', 'Đã lưu Promo'); }} onError={(m) => flash('err', m)} />
        </TabsContent>

        <TabsContent value="trust">
          <TrustItemsEditor items={data.trustItems} onChanged={() => { refresh(); flash('ok', 'Đã cập nhật'); }} onError={(m) => flash('err', m)} />
        </TabsContent>

        <TabsContent value="featured">
          <FeaturedEditor items={data.featured} onChanged={() => { refresh(); flash('ok', 'Đã cập nhật'); }} onError={(m) => flash('err', m)} />
        </TabsContent>

        <TabsContent value="catalog">
          <CatalogEditor onError={(m) => flash('err', m)} onSuccess={(m) => flash('ok', m)} />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesEditor onError={(m) => flash('err', m)} onSuccess={(m) => flash('ok', m)} />
        </TabsContent>

        <TabsContent value="community">
          <CommunityPhotosEditor onError={(m) => flash('err', m)} onSuccess={(m) => flash('ok', m)} />
        </TabsContent>

        <TabsContent value="fund">
          <FundEntriesEditor onError={(m) => flash('err', m)} onSuccess={(m) => flash('ok', m)} />
        </TabsContent>

        <TabsContent value="testimonials">
          <TestimonialsEditor onError={(m) => flash('err', m)} onSuccess={(m) => flash('ok', m)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Image upload primitive
// ============================================================
function ImageUpload({ value, onChange, onError, label = 'Ảnh' }: {
  value: string | null;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onError('Ảnh không được lớn hơn 5MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.adminLandingUploadImage(fd);
      onChange(res.url);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const abs = absoluteUrl(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        <div className="relative w-40 h-40 rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center">
          {abs ? (
            <Image
              src={abs}
              alt={label}
              fill
              sizes="160px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xs text-muted-foreground text-center px-2">Chưa có ảnh</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} className="mr-2" />
            {uploading ? 'Đang tải…' : value ? 'Đổi ảnh' : 'Chọn ảnh'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(null)}
            >
              <X size={14} className="mr-2" /> Gỡ ảnh
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">PNG/JPG/WebP, tối đa 5MB</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Hero editor
// ============================================================
function HeroEditor({ hero, onSaved, onError }: {
  hero: Hero;
  onSaved: (h: Hero) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<Hero>(hero);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Hero>(k: K, v: Hero[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.adminLandingUpdateHero(form as unknown as Record<string, unknown>);
      onSaved(updated);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Hero</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Field label="Eyebrow">
              <Input value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
            </Field>
            <Field label="Tiêu đề chính">
              <textarea
                className="w-full min-h-[88px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>
            <Field label="Mô tả">
              <textarea
                className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA chính – chữ"><Input value={form.primaryCtaText} onChange={(e) => set('primaryCtaText', e.target.value)} /></Field>
              <Field label="CTA chính – link"><Input value={form.primaryCtaHref} onChange={(e) => set('primaryCtaHref', e.target.value)} /></Field>
              <Field label="CTA phụ – chữ"><Input value={form.secondaryCtaText ?? ''} onChange={(e) => set('secondaryCtaText', e.target.value || null)} /></Field>
              <Field label="CTA phụ – link"><Input value={form.secondaryCtaHref ?? ''} onChange={(e) => set('secondaryCtaHref', e.target.value || null)} /></Field>
            </div>
          </div>
          <div className="space-y-3">
            <ImageUpload
              value={form.imageUrl}
              onChange={(u) => set('imageUrl', u)}
              onError={onError}
              label="Ảnh Hero (cột phải)"
            />
            <div className="space-y-2">
              <Label>Số liệu</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Giá trị 1" value={form.stat1Value} onChange={(e) => set('stat1Value', e.target.value)} />
                <Input placeholder="Nhãn 1" value={form.stat1Label} onChange={(e) => set('stat1Label', e.target.value)} />
                <Input placeholder="Giá trị 2" value={form.stat2Value} onChange={(e) => set('stat2Value', e.target.value)} />
                <Input placeholder="Nhãn 2" value={form.stat2Label} onChange={(e) => set('stat2Label', e.target.value)} />
                <Input placeholder="Giá trị 3" value={form.stat3Value} onChange={(e) => set('stat3Value', e.target.value)} />
                <Input placeholder="Nhãn 3" value={form.stat3Label} onChange={(e) => set('stat3Label', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="hero-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />
              <Label htmlFor="hero-active">Hiển thị trên trang chủ</Label>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={save} disabled={saving}>
            <Save size={14} className="mr-2" />
            {saving ? 'Đang lưu…' : 'Lưu Hero'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Promo banner editor
// ============================================================
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function PromoEditor({ promo, onSaved, onError }: {
  promo: Promo;
  onSaved: (p: Promo) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<Promo>(promo);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Promo>(k: K, v: Promo[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.adminLandingUpdatePromo(form as unknown as Record<string, unknown>);
      onSaved(updated);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Promo Banner</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Field label="Eyebrow"><Input value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
            <Field label="Tiêu đề">
              <textarea
                className="w-full min-h-[88px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>
            <Field label="Mô tả">
              <textarea
                className="w-full min-h-[88px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
              />
            </Field>
            <Field label="Hạn chương trình (countdown sẽ đếm về thời điểm này)">
              <Input
                type="datetime-local"
                value={isoToLocalInput(form.endDate)}
                onChange={(e) => set('endDate', localInputToIso(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Để trống → ẩn countdown, hiển thị placeholder tĩnh. Khi tới hạn, countdown tự về 0.
              </p>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA chính – chữ"><Input value={form.primaryCtaText} onChange={(e) => set('primaryCtaText', e.target.value)} /></Field>
              <Field label="CTA chính – link"><Input value={form.primaryCtaHref} onChange={(e) => set('primaryCtaHref', e.target.value)} /></Field>
              <Field label="CTA phụ – chữ"><Input value={form.secondaryCtaText ?? ''} onChange={(e) => set('secondaryCtaText', e.target.value || null)} /></Field>
              <Field label="CTA phụ – link"><Input value={form.secondaryCtaHref ?? ''} onChange={(e) => set('secondaryCtaHref', e.target.value || null)} /></Field>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="promo-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />
              <Label htmlFor="promo-active">Hiển thị trên trang chủ</Label>
            </div>
          </div>
          <div>
            <ImageUpload
              value={form.imageUrl}
              onChange={(u) => set('imageUrl', u)}
              onError={onError}
              label="Ảnh nền banner"
            />
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={save} disabled={saving}>
            <Save size={14} className="mr-2" />
            {saving ? 'Đang lưu…' : 'Lưu Promo Banner'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Trust items editor (CRUD list)
// ============================================================
function TrustItemsEditor({ items, onChanged, onError }: {
  items: TrustItem[];
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [draft, setDraft] = useState<{ title: string; subtitle: string; iconName: string; displayOrder: number }>(
    { title: '', subtitle: '', iconName: 'ShieldCheck', displayOrder: items.length }
  );
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!draft.title || !draft.subtitle) { onError('Cần nhập title và subtitle'); return; }
    setCreating(true);
    try {
      await api.adminLandingCreateTrustItem(draft);
      setDraft({ title: '', subtitle: '', iconName: 'ShieldCheck', displayOrder: items.length + 1 });
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Trust Bar — các items hiển thị thanh tin cậy</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Chưa có item — thêm bên dưới.</p>}
          {items.map((it) => (
            <TrustItemRow key={it.id} item={it} onChanged={onChanged} onError={onError} />
          ))}
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Thêm item mới</h3>
          <div className="grid sm:grid-cols-4 gap-2">
            <Input
              placeholder="Tiêu đề (vd: Nguồn gốc rõ ràng)"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Input
              placeholder="Subtitle"
              value={draft.subtitle}
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            />
            <Select value={draft.iconName} onValueChange={(v) => setDraft({ ...draft, iconName: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRUST_ICON_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={create} disabled={creating}>
              <Plus size={14} className="mr-2" />
              {creating ? 'Đang tạo…' : 'Thêm'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrustItemRow({ item, onChanged, onError }: {
  item: TrustItem;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(item);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.adminLandingUpdateTrustItem(item.id, form as unknown as Record<string, unknown>);
      setEdit(false);
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Xoá "${item.title}"?`)) return;
    setBusy(true);
    try {
      await api.adminLandingDeleteTrustItem(item.id);
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!edit) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{item.title}</span>
            <Badge variant="outline" className="text-[10px]">{item.iconName}</Badge>
            {!item.isActive && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Ẩn</Badge>}
            <span className="text-xs text-muted-foreground">#{item.displayOrder}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{item.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEdit(true)}>Sửa</Button>
          <Button variant="outline" size="sm" onClick={remove} disabled={busy} className="text-red-600">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="grid sm:grid-cols-4 gap-2">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tiêu đề" />
        <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" />
        <Select value={form.iconName} onValueChange={(v) => setForm({ ...form, iconName: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRUST_ICON_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={form.displayOrder}
          onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
          placeholder="Order"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          id={`trust-active-${item.id}`}
        />
        <Label htmlFor={`trust-active-${item.id}`} className="text-xs">Hiển thị</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => { setForm(item); setEdit(false); }}>Huỷ</Button>
        <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
      </div>
    </div>
  );
}

// ============================================================
// Featured products editor
// ============================================================
function FeaturedEditor({ items, onChanged, onError }: {
  items: FeaturedProduct[];
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const allProducts = useMemo(() => PRODUCTS.map((p) => ({ slug: p.slug, name: p.name })), []);
  const usedSlugs = (section: 'featured' | 'deals') =>
    new Set(items.filter((it) => it.section === section).map((it) => it.productSlug));

  const featured = items.filter((it) => it.section === 'featured');
  const deals = items.filter((it) => it.section === 'deals');

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Sản phẩm nổi bật</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Pick từ danh sách 200+ sản phẩm. Sản phẩm sẽ hiển thị theo display order.
          Để trống section → frontend rơi về 8 hardcoded mặc định.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <FeaturedSection
          label="Sản phẩm nổi bật (Hàng tuyển chọn)"
          section="featured"
          items={featured}
          allProducts={allProducts}
          usedSlugs={usedSlugs('featured')}
          onChanged={onChanged}
          onError={onError}
        />
        <FeaturedSection
          label="Ưu đãi đặc biệt (Deals)"
          section="deals"
          items={deals}
          allProducts={allProducts}
          usedSlugs={usedSlugs('deals')}
          onChanged={onChanged}
          onError={onError}
        />
      </CardContent>
    </Card>
  );
}

function FeaturedSection({ label, section, items, allProducts, usedSlugs, onChanged, onError }: {
  label: string;
  section: 'featured' | 'deals';
  items: FeaturedProduct[];
  allProducts: { slug: string; name: string }[];
  usedSlugs: Set<string>;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [draftSlug, setDraftSlug] = useState('');
  const [busy, setBusy] = useState(false);

  const available = allProducts.filter((p) => !usedSlugs.has(p.slug));

  const add = async () => {
    if (!draftSlug) return;
    setBusy(true);
    try {
      await api.adminLandingCreateFeatured({
        section,
        productSlug: draftSlug,
        displayOrder: items.length,
        isActive: true,
      });
      setDraftSlug('');
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{label}</h3>
      <div className="space-y-1.5">
        {items.length === 0 && <p className="text-xs text-muted-foreground">— Chưa pick sản phẩm nào</p>}
        {items.map((it) => {
          const product = allProducts.find((p) => p.slug === it.productSlug);
          return (
            <FeaturedRow
              key={it.id}
              item={it}
              productName={product?.name ?? `(slug không tìm thấy: ${it.productSlug})`}
              onChanged={onChanged}
              onError={onError}
            />
          );
        })}
      </div>
      <div className="flex gap-2 pt-2">
        <Select value={draftSlug} onValueChange={setDraftSlug}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Chọn sản phẩm…" /></SelectTrigger>
          <SelectContent>
            {available.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
            {available.length === 0 && <SelectItem value="_" disabled>Đã pick hết</SelectItem>}
          </SelectContent>
        </Select>
        <Button onClick={add} disabled={busy || !draftSlug}>
          <Plus size={14} className="mr-2" />Thêm
        </Button>
      </div>
    </div>
  );
}

function FeaturedRow({ item, productName, onChanged, onError }: {
  item: FeaturedProduct;
  productName: string;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const setOrder = async (delta: number) => {
    setBusy(true);
    try {
      await api.adminLandingUpdateFeatured(item.id, { displayOrder: item.displayOrder + delta });
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggleActive = async () => {
    setBusy(true);
    try {
      await api.adminLandingUpdateFeatured(item.id, { isActive: !item.isActive });
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm(`Gỡ "${productName}"?`)) return;
    setBusy(true);
    try {
      await api.adminLandingDeleteFeatured(item.id);
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground w-8">#{item.displayOrder}</span>
      <span className="flex-1 text-sm truncate">{productName}</span>
      {!item.isActive && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Ẩn</Badge>}
      <Button variant="outline" size="sm" onClick={() => setOrder(-1)} disabled={busy}>↑</Button>
      <Button variant="outline" size="sm" onClick={() => setOrder(1)} disabled={busy}>↓</Button>
      <Button variant="outline" size="sm" onClick={toggleActive} disabled={busy}>
        {item.isActive ? 'Ẩn' : 'Hiện'}
      </Button>
      <Button variant="outline" size="sm" onClick={remove} disabled={busy} className="text-red-600">
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

// ============================================================
// Catalog editor — list/search/CRUD all landing products
// ============================================================
type CatalogProduct = {
  id: number;
  slug: string;
  categorySlug: string;
  name: string;
  art: string;
  tone: string;
  price: number;
  was: number | null;
  rating: number | string;
  sold: string;
  region: string;
  verified: boolean;
  badges: { label: string; variant: string }[] | null;
  imageUrl: string | null;
  brand: string;
  origin: string;
  weight: string;
  certifications: string;
  distributor: string;
  description: string;
  thumbs: string[] | null;
  producerName: string | null;
  producerHometown: string | null;
  producerUnit: string | null;
  producerContribution: number | null;
  isActive: boolean;
  displayOrder: number;
};

const TONE_OPTIONS = ['paper', 'red', 'olive', 'gold'];
const ICON_OPTIONS = ['wheat', 'soup', 'coffee', 'mountain', 'sun', 'palmtree', 'home', 'gift', 'tag', 'compass'];
const BADGE_VARIANT_OPTIONS = ['red', 'olive', 'gold', 'soft', 'oliveSoft'];
const DEFAULT_THUMBS = ['Mặt trước', 'Đóng gói', 'Cận cảnh', 'Vùng nguyên liệu'];

function emptyProduct(): CatalogProduct {
  return {
    id: 0, slug: '', categorySlug: CATEGORIES[0]?.slug ?? '', name: '',
    art: '', tone: 'paper', price: 0, was: null, rating: 4.7, sold: '0',
    region: '', verified: false, badges: null, imageUrl: null,
    brand: '—', origin: '—', weight: '—', certifications: '—', distributor: '—',
    description: '', thumbs: DEFAULT_THUMBS,
    producerName: null, producerHometown: null, producerUnit: null, producerContribution: null,
    isActive: true, displayOrder: 0,
  };
}

function CatalogEditor({ onError, onSuccess }: {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const limit = 20;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    api.adminLandingProducts({ search: debouncedSearch, category, page, limit })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((e) => onError((e as Error).message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(load, [debouncedSearch, category, page]);

  const remove = async (p: CatalogProduct) => {
    if (!confirm(`Xoá sản phẩm "${p.name}"?`)) return;
    try {
      await api.adminLandingDeleteProduct(p.id);
      onSuccess('Đã xoá');
      load();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Catalog sản phẩm ({total})</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Tất cả sản phẩm hiển thị trên landing và trang danh mục/chi tiết.
          DB override hardcoded — slug nào có ở đây sẽ thay thế bản hardcoded.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tên, slug, vùng…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={category || '__all'} onValueChange={(v) => { setCategory(v === '__all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Tất cả danh mục" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tất cả danh mục</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditing(emptyProduct())}>
            <Plus size={14} className="mr-2" />Thêm sản phẩm
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Không có sản phẩm.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Ảnh</th>
                  <th className="text-left p-2 font-medium">Tên / slug</th>
                  <th className="text-left p-2 font-medium">Danh mục</th>
                  <th className="text-right p-2 font-medium">Giá</th>
                  <th className="text-left p-2 font-medium">Vùng</th>
                  <th className="text-center p-2 font-medium">Active</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="p-2">
                      {p.imageUrl ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                          <Image src={absoluteUrl(p.imageUrl)!} alt={p.name} fill sizes="48px" className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-[9px] text-muted-foreground text-center px-1 whitespace-pre-wrap">
                          {p.art || '—'}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.slug}</div>
                    </td>
                    <td className="p-2 text-xs">{CATEGORIES.find((c) => c.slug === p.categorySlug)?.name ?? p.categorySlug}</td>
                    <td className="p-2 text-right">
                      <div className="font-semibold">{Number(p.price).toLocaleString('vi-VN')} ₫</div>
                      {p.was && <div className="text-xs text-muted-foreground line-through">{Number(p.was).toLocaleString('vi-VN')} ₫</div>}
                    </td>
                    <td className="p-2 text-xs">{p.region || '—'}</td>
                    <td className="p-2 text-center">
                      {p.isActive ? <Badge className="bg-emerald-100 text-emerald-700">Hiện</Badge> : <Badge className="bg-amber-100 text-amber-700">Ẩn</Badge>}
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                        <Pencil size={12} className="mr-1" /> Sửa
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(p)} className="text-red-600 ml-2">
                        <Trash2 size={12} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-between text-sm pt-2">
            <span className="text-muted-foreground">Trang {page} / {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau →</Button>
            </div>
          </div>
        )}
      </CardContent>

      {editing && (
        <ProductEditDialog
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSuccess('Đã lưu'); load(); }}
          onError={onError}
        />
      )}
    </Card>
  );
}

function ProductEditDialog({ product, onClose, onSaved, onError }: {
  product: CatalogProduct;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const isNew = product.id === 0;
  const [form, setForm] = useState<CatalogProduct>(product);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CatalogProduct>(k: K, v: CatalogProduct[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.slug || !form.name || !form.categorySlug) {
      onError('Cần slug, tên, và danh mục');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        slug: form.slug, categorySlug: form.categorySlug, name: form.name,
        art: form.art, tone: form.tone, price: form.price, was: form.was,
        rating: Number(form.rating) || 0, sold: form.sold, region: form.region,
        verified: form.verified, badges: form.badges, imageUrl: form.imageUrl,
        brand: form.brand, origin: form.origin, weight: form.weight,
        certifications: form.certifications, distributor: form.distributor,
        description: form.description, thumbs: form.thumbs,
        producerName: form.producerName, producerHometown: form.producerHometown,
        producerUnit: form.producerUnit, producerContribution: form.producerContribution,
        isActive: form.isActive, displayOrder: form.displayOrder,
      };
      if (isNew) await api.adminLandingCreateProduct(payload);
      else await api.adminLandingUpdateProduct(form.id, payload);
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateThumb = (i: number, val: string) => {
    const next = [...(form.thumbs ?? DEFAULT_THUMBS)];
    next[i] = val;
    set('thumbs', next);
  };

  const updateBadge = (i: number, key: 'label' | 'variant', val: string) => {
    const next = [...(form.badges ?? [])];
    next[i] = { ...next[i], [key]: val } as { label: string; variant: string };
    set('badges', next);
  };
  const addBadge = () => set('badges', [...(form.badges ?? []), { label: '', variant: 'red' }]);
  const removeBadge = (i: number) => set('badges', (form.badges ?? []).filter((_, idx) => idx !== i));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Thêm sản phẩm' : `Sửa: ${product.name}`}</DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-4 py-2">
          <div className="space-y-3">
            <Field label="Slug (URL)">
              <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="vd: gao-st25-soc-trang" disabled={!isNew} />
              {!isNew && <p className="text-[11px] text-muted-foreground mt-1">Slug khoá vì đã dùng làm URL/foreign key</p>}
            </Field>
            <Field label="Tên sản phẩm">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Danh mục">
              <Select value={form.categorySlug} onValueChange={(v) => set('categorySlug', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Giá (₫)">
                <Input type="number" value={form.price} onChange={(e) => set('price', parseInt(e.target.value, 10) || 0)} />
              </Field>
              <Field label="Giá gạch (₫)">
                <Input type="number" value={form.was ?? ''} onChange={(e) => set('was', e.target.value ? parseInt(e.target.value, 10) : null)} />
              </Field>
              <Field label="Vùng / nguồn gốc">
                <Input value={form.region} onChange={(e) => set('region', e.target.value)} />
              </Field>
              <Field label="Đã bán">
                <Input value={form.sold} onChange={(e) => set('sold', e.target.value)} placeholder="vd: 1.2k" />
              </Field>
              <Field label="Rating (0-5)">
                <Input type="number" step="0.1" min={0} max={5} value={form.rating} onChange={(e) => set('rating', e.target.value)} />
              </Field>
              <Field label="Order">
                <Input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder', parseInt(e.target.value, 10) || 0)} />
              </Field>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} />
                CCB xác nhận
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                Hiển thị
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <ImageUpload value={form.imageUrl} onChange={(u) => set('imageUrl', u)} onError={onError} label="Ảnh sản phẩm" />
            <Field label="Art label (chữ thay ảnh khi không có ảnh)">
              <Input value={form.art} onChange={(e) => set('art', e.target.value)} placeholder="vd: GẠO\nST25" />
            </Field>
            <Field label="Tone (màu nền khi không có ảnh)">
              <Select value={form.tone} onValueChange={(v) => set('tone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Badges (nhãn nhỏ trên ảnh)</Label>
                <Button variant="outline" size="sm" onClick={addBadge}>
                  <Plus size={12} className="mr-1" />Thêm badge
                </Button>
              </div>
              {(form.badges ?? []).length === 0 && (
                <p className="text-[11px] text-muted-foreground">Không có badge</p>
              )}
              {(form.badges ?? []).map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input className="flex-1" placeholder="Label (vd: −15%, Hot)" value={b.label} onChange={(e) => updateBadge(i, 'label', e.target.value)} />
                  <Select value={b.variant} onValueChange={(v) => updateBadge(i, 'variant', v)}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BADGE_VARIANT_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => removeBadge(i)} className="text-red-600">
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Rich fields (used on /product/[slug] detail page) ---- */}
        <div className="border-t pt-4 mt-2">
          <h3 className="text-sm font-semibold mb-3">Trang chi tiết sản phẩm</h3>
          <div className="grid lg:grid-cols-2 gap-3">
            <Field label="Thương hiệu (brand)"><Input value={form.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
            <Field label="Xuất xứ (origin)"><Input value={form.origin} onChange={(e) => set('origin', e.target.value)} /></Field>
            <Field label="Trọng lượng / quy cách"><Input value={form.weight} onChange={(e) => set('weight', e.target.value)} /></Field>
            <Field label="Chứng nhận"><Input value={form.certifications} onChange={(e) => set('certifications', e.target.value)} /></Field>
            <Field label="Nhà phân phối"><Input value={form.distributor} onChange={(e) => set('distributor', e.target.value)} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Mô tả chi tiết">
              <textarea
                className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Mô tả sản phẩm xuất hiện ở phần dưới trang chi tiết…"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Nhãn 4 ô thumb (dùng cho gallery)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {[0, 1, 2, 3].map((i) => (
                <Input
                  key={i}
                  value={(form.thumbs ?? DEFAULT_THUMBS)[i] ?? ''}
                  onChange={(e) => updateThumb(i, e.target.value)}
                  placeholder={DEFAULT_THUMBS[i]}
                />
              ))}
            </div>
          </div>

          {/* ---- Producer info (tên + quê CCB sản xuất) ---- */}
          <div className="border-t pt-4 mt-3">
            <h4 className="text-sm font-semibold mb-1">Người lính sản xuất</h4>
            <p className="text-[11px] text-muted-foreground mb-3">
              Thông tin CCB đứng sau sản phẩm — hiển thị trên thẻ và trang chi tiết.
            </p>
            <div className="grid lg:grid-cols-2 gap-3">
              <Field label="Tên CCB"><Input value={form.producerName ?? ''} onChange={(e) => set('producerName', e.target.value || null)} placeholder="vd: Ông Hồ Quang Cua" /></Field>
              <Field label="Quê quán"><Input value={form.producerHometown ?? ''} onChange={(e) => set('producerHometown', e.target.value || null)} placeholder="vd: Sóc Trăng" /></Field>
              <Field label="Đơn vị quân ngũ cũ"><Input value={form.producerUnit ?? ''} onChange={(e) => set('producerUnit', e.target.value || null)} placeholder="vd: CCB Quân khu 9" /></Field>
              <Field label="Trích quỹ Vì đồng đội (₫/đơn)">
                <Input type="number" value={form.producerContribution ?? ''} onChange={(e) => set('producerContribution', e.target.value ? parseInt(e.target.value, 10) : null)} placeholder="vd: 1870" />
              </Field>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={save} disabled={saving}>
            <Save size={14} className="mr-2" />
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Categories editor — list/CRUD all landing categories (10 typical)
// ============================================================
type CmsCategory = {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  icon: string;
  tone: string;
  description: string;
  productCount: number;
  filters: { regions: { label: string; count: number; checked?: boolean }[] } | null;
  displayOrder: number;
  isActive: boolean;
};

function emptyCategory(): CmsCategory {
  return {
    id: 0, slug: '', name: '', shortName: null, icon: 'tag', tone: 'paper',
    description: '', productCount: 0,
    filters: { regions: [] }, displayOrder: 0, isActive: true,
  };
}

function CategoriesEditor({ onError, onSuccess }: {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [items, setItems] = useState<CmsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CmsCategory | null>(null);

  const load = () => {
    setLoading(true);
    api.adminLandingCategories()
      .then((res) => setItems(res))
      .catch((e) => onError((e as Error).message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(load, []);

  const remove = async (c: CmsCategory) => {
    if (!confirm(`Xoá danh mục "${c.name}"?\nLưu ý: sản phẩm thuộc danh mục này sẽ vẫn còn slug nhưng không có category page.`)) return;
    try {
      await api.adminLandingDeleteCategory(c.id);
      onSuccess('Đã xoá');
      load();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Danh mục ({items.length})</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          DB row override hardcoded — slug nào có ở đây sẽ thay bản hardcoded trên header, landing và trang category.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={() => setEditing(emptyCategory())}>
            <Plus size={14} className="mr-2" />Thêm danh mục
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chưa có danh mục.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium w-12">#</th>
                  <th className="text-left p-2 font-medium">Tên / slug</th>
                  <th className="text-left p-2 font-medium">Icon</th>
                  <th className="text-left p-2 font-medium">Tone</th>
                  <th className="text-right p-2 font-medium">Số SP</th>
                  <th className="text-center p-2 font-medium">Active</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-2 text-xs text-muted-foreground">{c.displayOrder}</td>
                    <td className="p-2">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.slug}</div>
                    </td>
                    <td className="p-2 text-xs">{c.icon}</td>
                    <td className="p-2 text-xs">{c.tone}</td>
                    <td className="p-2 text-right">{c.productCount}</td>
                    <td className="p-2 text-center">
                      {c.isActive ? <Badge className="bg-emerald-100 text-emerald-700">Hiện</Badge> : <Badge className="bg-amber-100 text-amber-700">Ẩn</Badge>}
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                        <Pencil size={12} className="mr-1" /> Sửa
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(c)} className="text-red-600 ml-2">
                        <Trash2 size={12} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {editing && (
        <CategoryEditDialog
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSuccess('Đã lưu'); load(); }}
          onError={onError}
        />
      )}
    </Card>
  );
}

function CategoryEditDialog({ category, onClose, onSaved, onError }: {
  category: CmsCategory;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const isNew = category.id === 0;
  const [form, setForm] = useState<CmsCategory>(category);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CmsCategory>(k: K, v: CmsCategory[K]) => setForm((f) => ({ ...f, [k]: v }));

  const regions = form.filters?.regions ?? [];
  const updateRegion = (i: number, key: 'label' | 'count' | 'checked', val: string | number | boolean) => {
    const next = [...regions];
    next[i] = { ...next[i], [key]: val } as { label: string; count: number; checked?: boolean };
    set('filters', { regions: next });
  };
  const addRegion = () => set('filters', { regions: [...regions, { label: '', count: 0 }] });
  const removeRegion = (i: number) => set('filters', { regions: regions.filter((_, idx) => idx !== i) });

  const save = async () => {
    if (!form.slug || !form.name) {
      onError('Cần slug và tên');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        slug: form.slug, name: form.name, shortName: form.shortName,
        icon: form.icon, tone: form.tone, description: form.description,
        productCount: form.productCount, filters: form.filters,
        displayOrder: form.displayOrder, isActive: form.isActive,
      };
      if (isNew) await api.adminLandingCreateCategory(payload);
      else await api.adminLandingUpdateCategory(form.id, payload);
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Thêm danh mục' : `Sửa: ${category.name}`}</DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-3 py-2">
          <Field label="Slug (URL)">
            <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} disabled={!isNew} />
            {!isNew && <p className="text-[11px] text-muted-foreground mt-1">Slug khoá vì đã dùng làm URL</p>}
          </Field>
          <Field label="Tên">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Tên rút gọn">
            <Input value={form.shortName ?? ''} onChange={(e) => set('shortName', e.target.value || null)} placeholder="(tuỳ chọn)" />
          </Field>
          <Field label="Số SP (hiển thị)">
            <Input type="number" value={form.productCount} onChange={(e) => set('productCount', parseInt(e.target.value, 10) || 0)} />
          </Field>
          <Field label="Icon">
            <Select value={form.icon} onValueChange={(v) => set('icon', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tone">
            <Select value={form.tone} onValueChange={(v) => set('tone', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Order">
            <Input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder', parseInt(e.target.value, 10) || 0)} />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Hiển thị
            </label>
          </div>
        </div>

        <Field label="Mô tả (hiện trên trang category)">
          <textarea
            className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Bộ lọc theo vùng (sidebar trên trang category)</Label>
            <Button variant="outline" size="sm" onClick={addRegion}>
              <Plus size={12} className="mr-1" />Thêm vùng
            </Button>
          </div>
          {regions.length === 0 && <p className="text-[11px] text-muted-foreground">Chưa có filter</p>}
          {regions.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="flex-1" placeholder="Tên vùng" value={r.label} onChange={(e) => updateRegion(i, 'label', e.target.value)} />
              <Input className="w-20" type="number" placeholder="Count" value={r.count} onChange={(e) => updateRegion(i, 'count', parseInt(e.target.value, 10) || 0)} />
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input type="checkbox" checked={r.checked ?? false} onChange={(e) => updateRegion(i, 'checked', e.target.checked)} />
                Chọn sẵn
              </label>
              <Button variant="outline" size="sm" onClick={() => removeRegion(i)} className="text-red-600">
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={save} disabled={saving}>
            <Save size={14} className="mr-2" />
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Why-Us editor (singleton)
// ============================================================
function WhyUsEditor({ whyUs, onSaved, onError }: {
  whyUs: WhyUs;
  onSaved: (w: WhyUs) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<WhyUs>(whyUs);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof WhyUs>(k: K, v: WhyUs[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.adminLandingUpdateWhyUs(form as unknown as Record<string, unknown>);
      onSaved(updated);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Tại sao chúng tôi làm dự án này?</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Khối storytelling sau Hero — kể lý do dự án ra đời. Tối đa ~150 chữ cho phần body.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Field label="Eyebrow">
              <Input value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
            </Field>
            <Field label="Tiêu đề">
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Body (mô tả)">
              <textarea
                className="w-full min-h-[160px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">{form.body.length} ký tự (gợi ý ~150 chữ ≈ 800-1000 ký tự)</p>
            </Field>
            <div className="flex items-center gap-2">
              <input id="why-active" type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              <Label htmlFor="why-active">Hiển thị trên trang chủ</Label>
            </div>
          </div>
          <ImageUpload
            value={form.imageUrl}
            onChange={(u) => set('imageUrl', u)}
            onError={onError}
            label="Ảnh kèm (optional, ưu tiên ảnh thật)"
          />
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={save} disabled={saving}>
            <Save size={14} className="mr-2" />
            {saving ? 'Đang lưu…' : 'Lưu khối Tại sao'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Community photos editor (Hành trình kết nối)
// ============================================================
type CommunityPhoto = {
  id: number;
  imageUrl: string | null;
  caption: string;
  impactValue: string | null;
  impactLabel: string | null;
  displayOrder: number;
  isActive: boolean;
};

function emptyCommunityPhoto(): CommunityPhoto {
  return { id: 0, imageUrl: null, caption: '', impactValue: '', impactLabel: '', displayOrder: 0, isActive: true };
}

function CommunityPhotosEditor({ onError, onSuccess }: {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [items, setItems] = useState<CommunityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CommunityPhoto | null>(null);

  const load = () => {
    setLoading(true);
    api.adminLandingCommunityPhotos()
      .then(setItems)
      .catch((e) => onError((e as Error).message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(load, []);

  const remove = async (p: CommunityPhoto) => {
    if (!confirm(`Xoá "${p.caption}"?`)) return;
    try {
      await api.adminLandingDeleteCommunityPhoto(p.id);
      onSuccess('Đã xoá');
      load();
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Hành trình kết nối ({items.length})</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Ảnh thật hoạt động cộng đồng + caption + chỉ số tác động (vd: "47" / "Gia đình CCB"). Hiển thị 3-4 cái trên trang chủ là đẹp.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={() => setEditing(emptyCommunityPhoto())}>
            <Plus size={14} className="mr-2" />Thêm ảnh
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chưa có ảnh.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((p) => (
              <div key={p.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="relative aspect-[4/3] bg-muted">
                  {p.imageUrl ? (
                    <Image src={absoluteUrl(p.imageUrl)!} alt={p.caption} fill sizes="320px" className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Chưa có ảnh</div>
                  )}
                  {!p.isActive && <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">Ẩn</span>}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-sm font-medium line-clamp-2">{p.caption}</p>
                  {(p.impactValue || p.impactLabel) && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">{p.impactValue}</span> {p.impactLabel}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                      <Pencil size={12} className="mr-1" />Sửa
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => remove(p)} className="text-red-600">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {editing && (
        <CommunityPhotoDialog
          photo={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSuccess('Đã lưu'); load(); }}
          onError={onError}
        />
      )}
    </Card>
  );
}

function CommunityPhotoDialog({ photo, onClose, onSaved, onError }: {
  photo: CommunityPhoto;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const isNew = photo.id === 0;
  const [form, setForm] = useState<CommunityPhoto>(photo);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CommunityPhoto>(k: K, v: CommunityPhoto[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.caption) { onError('Cần caption'); return; }
    setSaving(true);
    try {
      const payload = { imageUrl: form.imageUrl, caption: form.caption, impactValue: form.impactValue, impactLabel: form.impactLabel, displayOrder: form.displayOrder, isActive: form.isActive };
      if (isNew) await api.adminLandingCreateCommunityPhoto(payload);
      else await api.adminLandingUpdateCommunityPhoto(form.id, payload);
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Thêm ảnh hoạt động' : 'Sửa ảnh hoạt động'}</DialogTitle>
        </DialogHeader>
        <div className="grid lg:grid-cols-2 gap-4 py-2">
          <ImageUpload value={form.imageUrl} onChange={(u) => set('imageUrl', u)} onError={onError} label="Ảnh hoạt động" />
          <div className="space-y-3">
            <Field label="Caption">
              <textarea className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm" value={form.caption} onChange={(e) => set('caption', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Impact value"><Input value={form.impactValue ?? ''} onChange={(e) => set('impactValue', e.target.value || null)} placeholder="vd: 47 hoặc 12.000.000 ₫" /></Field>
              <Field label="Impact label"><Input value={form.impactLabel ?? ''} onChange={(e) => set('impactLabel', e.target.value || null)} placeholder="vd: Gia đình CCB" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Order"><Input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder', parseInt(e.target.value, 10) || 0)} /></Field>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                  Hiển thị
                </label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={save} disabled={saving}><Save size={14} className="mr-2" />{saving ? 'Đang lưu…' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Fund entries editor (Quỹ Vì đồng đội)
// ============================================================
type FundEntry = {
  id: number;
  occurredAt: string;
  type: 'in' | 'out';
  amount: number;
  description: string;
  balance: number | null;
  displayOrder: number;
  isActive: boolean;
};

function emptyFundEntry(): FundEntry {
  return { id: 0, occurredAt: new Date().toISOString(), type: 'in', amount: 0, description: '', balance: null, displayOrder: 0, isActive: true };
}

function FundEntriesEditor({ onError, onSuccess }: {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [items, setItems] = useState<FundEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FundEntry | null>(null);

  const load = () => {
    setLoading(true);
    api.adminLandingFundEntries()
      .then(setItems)
      .catch((e) => onError((e as Error).message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(load, []);

  const remove = async (e: FundEntry) => {
    if (!confirm(`Xoá khoản "${e.description}"?`)) return;
    try {
      await api.adminLandingDeleteFundEntry(e.id);
      onSuccess('Đã xoá');
      load();
    } catch (err) { onError((err as Error).message); }
  };

  const totals = items.filter((e) => e.isActive).reduce((acc, e) => {
    if (e.type === 'in') acc.in += e.amount;
    else acc.out += e.amount;
    return acc;
  }, { in: 0, out: 0 });
  const fmt = (n: number) => n.toLocaleString('vi-VN');

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Quỹ Vì đồng đội ({items.length})</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Lịch sử thu/chi theo thời gian. Hiển thị 12 entries gần nhất trên trang chủ.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm bg-muted/30 rounded-lg p-3">
          <div>
            <span className="text-xs text-muted-foreground">Tổng thu (active): </span>
            <span className="font-semibold text-emerald-700">{fmt(totals.in)} ₫</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Tổng chi (active): </span>
            <span className="font-semibold text-red-700">{fmt(totals.out)} ₫</span>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setEditing(emptyFundEntry())} size="sm">
              <Plus size={14} className="mr-2" />Thêm khoản
            </Button>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chưa có khoản nào.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Ngày</th>
                  <th className="text-left p-2 font-medium">Loại</th>
                  <th className="text-right p-2 font-medium">Số tiền</th>
                  <th className="text-left p-2 font-medium">Mô tả</th>
                  <th className="text-right p-2 font-medium">Số dư</th>
                  <th className="text-center p-2 font-medium">Active</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-2 text-xs whitespace-nowrap">{new Date(e.occurredAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-2">
                      <Badge className={e.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {e.type === 'in' ? 'Thu' : 'Chi'}
                      </Badge>
                    </td>
                    <td className={`p-2 text-right tabular-nums ${e.type === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {e.type === 'in' ? '+' : '−'}{fmt(e.amount)}
                    </td>
                    <td className="p-2">{e.description}</td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">{e.balance != null ? fmt(e.balance) : '—'}</td>
                    <td className="p-2 text-center">
                      {e.isActive ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Hiện</Badge> : <Badge className="bg-amber-100 text-amber-700 text-[10px]">Ẩn</Badge>}
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => setEditing(e)}><Pencil size={12} /></Button>
                      <Button variant="outline" size="sm" onClick={() => remove(e)} className="text-red-600 ml-1"><Trash2 size={12} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      {editing && (
        <FundEntryDialog
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSuccess('Đã lưu'); load(); }}
          onError={onError}
        />
      )}
    </Card>
  );
}

function FundEntryDialog({ entry, onClose, onSaved, onError }: {
  entry: FundEntry;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const isNew = entry.id === 0;
  const [form, setForm] = useState<FundEntry>(entry);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FundEntry>(k: K, v: FundEntry[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.description) { onError('Cần mô tả'); return; }
    setSaving(true);
    try {
      const payload = { occurredAt: form.occurredAt, type: form.type, amount: form.amount, description: form.description, balance: form.balance, displayOrder: form.displayOrder, isActive: form.isActive };
      if (isNew) await api.adminLandingCreateFundEntry(payload);
      else await api.adminLandingUpdateFundEntry(form.id, payload);
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Thêm khoản thu/chi' : 'Sửa khoản'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày">
              <Input type="date" value={form.occurredAt.slice(0, 10)} onChange={(e) => set('occurredAt', new Date(e.target.value).toISOString())} />
            </Field>
            <Field label="Loại">
              <Select value={form.type} onValueChange={(v) => set('type', v as 'in' | 'out')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Thu</SelectItem>
                  <SelectItem value="out">Chi</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Số tiền (₫)"><Input type="number" value={form.amount} onChange={(e) => set('amount', parseInt(e.target.value, 10) || 0)} /></Field>
            <Field label="Số dư sau khoản (tuỳ chọn)"><Input type="number" value={form.balance ?? ''} onChange={(e) => set('balance', e.target.value ? parseInt(e.target.value, 10) : null)} /></Field>
          </div>
          <Field label="Mô tả">
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="vd: Trao 12 phần quà CCB Hà Giang" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order"><Input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder', parseInt(e.target.value, 10) || 0)} /></Field>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                Hiển thị
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={save} disabled={saving}><Save size={14} className="mr-2" />{saving ? 'Đang lưu…' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Testimonials editor (Tiếng nói chiến hữu)
// ============================================================
type Testimonial = {
  id: number;
  name: string;
  location: string;
  unit: string;
  body: string;
  photoUrl: string | null;
  verified: boolean;
  displayOrder: number;
  isActive: boolean;
};

function emptyTestimonial(): Testimonial {
  return { id: 0, name: '', location: '', unit: '', body: '', photoUrl: null, verified: true, displayOrder: 0, isActive: true };
}

function TestimonialsEditor({ onError, onSuccess }: {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Testimonial | null>(null);

  const load = () => {
    setLoading(true);
    api.adminLandingTestimonials()
      .then(setItems)
      .catch((e) => onError((e as Error).message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(load, []);

  const remove = async (t: Testimonial) => {
    if (!confirm(`Xoá lời cảm ơn từ "${t.name}"?`)) return;
    try {
      await api.adminLandingDeleteTestimonial(t.id);
      onSuccess('Đã xoá');
      load();
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Tiếng nói chiến hữu ({items.length})</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Lời cảm ơn thật từ CCB / khách hàng được hỗ trợ. Nên có ảnh chân dung để tăng tin cậy.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={() => setEditing(emptyTestimonial())}>
            <Plus size={14} className="mr-2" />Thêm lời cảm ơn
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chưa có testimonial.</p>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div key={t.id} className="rounded-lg border bg-card p-3 flex gap-3">
                <div className="relative w-14 h-14 rounded-full bg-muted overflow-hidden flex-none">
                  {t.photoUrl ? (
                    <Image src={absoluteUrl(t.photoUrl)!} alt={t.name} fill sizes="56px" className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-base font-semibold text-muted-foreground">
                      {t.name.split(' ').pop()?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{t.name}</span>
                    {t.verified && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Đã xác minh</Badge>}
                    {!t.isActive && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Ẩn</Badge>}
                    {(t.location || t.unit) && (
                      <span className="text-xs text-muted-foreground">{[t.unit, t.location].filter(Boolean).join(' · ')}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">&ldquo;{t.body}&rdquo;</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(t)}><Pencil size={12} /></Button>
                  <Button variant="outline" size="sm" onClick={() => remove(t)} className="text-red-600"><Trash2 size={12} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {editing && (
        <TestimonialDialog
          testimonial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSuccess('Đã lưu'); load(); }}
          onError={onError}
        />
      )}
    </Card>
  );
}

function TestimonialDialog({ testimonial, onClose, onSaved, onError }: {
  testimonial: Testimonial;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const isNew = testimonial.id === 0;
  const [form, setForm] = useState<Testimonial>(testimonial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Testimonial>(k: K, v: Testimonial[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.body) { onError('Cần tên và nội dung'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, location: form.location, unit: form.unit, body: form.body, photoUrl: form.photoUrl, verified: form.verified, displayOrder: form.displayOrder, isActive: form.isActive };
      if (isNew) await api.adminLandingCreateTestimonial(payload);
      else await api.adminLandingUpdateTestimonial(form.id, payload);
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Thêm lời cảm ơn' : `Sửa: ${testimonial.name}`}</DialogTitle>
        </DialogHeader>
        <div className="grid lg:grid-cols-2 gap-4 py-2">
          <ImageUpload value={form.photoUrl} onChange={(u) => set('photoUrl', u)} onError={onError} label="Ảnh chân dung" />
          <div className="space-y-3">
            <Field label="Tên (vd: Ông Trần Văn Hùng)"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Đơn vị / vai trò (vd: CCB Quân khu 3)"><Input value={form.unit} onChange={(e) => set('unit', e.target.value)} /></Field>
            <Field label="Quê quán / tỉnh"><Input value={form.location} onChange={(e) => set('location', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Order"><Input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder', parseInt(e.target.value, 10) || 0)} /></Field>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} />Xác minh</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />Hiển thị</label>
              </div>
            </div>
          </div>
        </div>
        <Field label="Nội dung lời cảm ơn">
          <textarea
            className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            placeholder="Cảm ơn đồng đội đã giúp gia đình tôi…"
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={save} disabled={saving}><Save size={14} className="mr-2" />{saving ? 'Đang lưu…' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Reusable field
// ============================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
