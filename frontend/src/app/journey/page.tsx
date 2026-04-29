'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LandingShell } from '@/components/landing/LandingShell';
import { type CommunityPhotoData } from '@/components/landing/CommunitySections';

const olive = '#556B2F';
const oliveDark = '#3F4F23';
const deepRed = '#8B0000';

export default function JourneyAllPage() {
  const [photos, setPhotos] = useState<CommunityPhotoData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/landing/content')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.communityPhotos) {
          setPhotos(data.communityPhotos as CommunityPhotoData[]);
        } else if (!cancelled) {
          setPhotos([]);
        }
      })
      .catch(() => { if (!cancelled) setPhotos([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <LandingShell>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 96px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span>Hành trình nghĩa tình</span>
        </div>

        {/* Hero */}
        <header style={{ marginTop: 24, marginBottom: 48, maxWidth: 820 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
            letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ccb-red)',
            marginBottom: 12,
          }}>
            ★ Hành trình nghĩa tình
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.15, margin: '0 0 16px',
          }}>
            Những chuyến xe — những mảnh đời được sưởi ấm
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 19, lineHeight: 1.65,
            color: 'var(--ink-2)', margin: 0,
          }}>
            Hình ảnh thật từ những chuyến đi của Ban liên lạc Trung đoàn E29 cùng đồng đội CCB tại các địa phương. Không photoshop, không stock — chỉ có những bàn tay đã từng cầm súng. Mỗi chuyến đi là một câu chuyện chưa kể.
          </p>
        </header>

        {/* Stats strip */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
          marginBottom: 56,
        }}>
          <Stat amount={photos?.length ?? 0} label="Hoạt động đã tổ chức" />
          <Stat amount={(photos?.length ?? 0) * 8} label="Lượt CCB được hỗ trợ" suffix=" +" />
          <Stat amount={28} label="Tỉnh thành đã đặt chân" suffix="" />
          <Stat amount={45} label="Triệu đồng đã trao" prefix="" suffix=" tr ₫" />
        </section>

        {/* Gallery */}
        {photos === null ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 60 }}>Đang tải hoạt động…</p>
        ) : photos.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
            padding: 48, textAlign: 'center', color: 'var(--ink-3)',
          }}>
            Chưa có hoạt động nào được công bố. Vui lòng quay lại sau.
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24,
          }}>
            {photos.filter((p) => p.isActive).map((p) => <ActivityCard key={p.id} photo={p} />)}
          </div>
        )}

        {/* CTA */}
        <section style={{
          marginTop: 64,
          background: 'linear-gradient(135deg, var(--ccb-olive-tint) 0%, #E0E5CD 100%)',
          border: '2px solid var(--ccb-olive)',
          borderRadius: 14, padding: '32px 28px', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24,
            color: oliveDark, marginBottom: 8,
          }}>
            Mỗi đơn hàng là một nghĩa cử
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.6,
            color: 'var(--ink-2)', margin: '0 0 20px', maxWidth: 620, marginLeft: 'auto', marginRight: 'auto',
          }}>
            1% từ mỗi đơn hàng tại CCB Mart được đưa vào quỹ Vì đồng đội. Bạn không chỉ mua hàng — bạn đang viết tiếp câu chuyện này.
          </p>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: olive, color: '#FFF8E7',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16,
            padding: '14px 28px', borderRadius: 8, minHeight: 52,
            boxShadow: '0 4px 12px rgba(85,107,47,0.25)',
          }}>
            Mua hàng — Ủng hộ đồng đội →
          </Link>
        </section>
      </main>
    </LandingShell>
  );
}

function Stat({ amount, label, prefix, suffix }: { amount: number; label: string; prefix?: string; suffix?: string }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 12,
      padding: '20px 22px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36,
        color: deepRed, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {prefix}{amount.toLocaleString('vi-VN')}{suffix ?? ''}
      </div>
      <div style={{
        marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 14,
        color: 'var(--ink-3)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {label}
      </div>
    </div>
  );
}

function ActivityCard({ photo }: { photo: CommunityPhotoData }) {
  return (
    <article style={{
      background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
      overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
      transition: 'transform .2s ease, box-shadow .2s ease',
    }}>
      <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--ccb-olive-tint)' }}>
        {photo.imageUrl ? (
          <Image src={photo.imageUrl} alt={photo.caption} fill sizes="(max-width: 720px) 100vw, 33vw" className="object-cover" unoptimized />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: olive, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
            textAlign: 'center', padding: 24,
          }}>
            Ảnh hoạt động
          </div>
        )}
      </div>
      <figcaption style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.5,
          color: 'var(--ink-1)', fontWeight: 600,
        }}>
          {photo.caption}
        </div>
        {(photo.impactValue || photo.impactLabel) && (
          <div style={{
            marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)',
            display: 'flex', alignItems: 'baseline', gap: 8,
          }}>
            {photo.impactValue && (
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: deepRed,
                fontVariantNumeric: 'tabular-nums',
              }}>{photo.impactValue}</span>
            )}
            {photo.impactLabel && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-3)' }}>
                {photo.impactLabel}
              </span>
            )}
          </div>
        )}
      </figcaption>
    </article>
  );
}
