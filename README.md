# RentaFlow

Profesyonel, mobil öncelikli **araç kiralama yönetim sistemi** (işletme operasyonları — marketplace değil).

## Durum

**STEP 1 tamamlandı:** proje analizi ve mimari planlama.

Uygulama kodu henüz yazılmadı. Plan belgeleri:

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — monorepo, stack, şema, RLS, servis katmanı
- [docs/DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md) — STEP 2–10 uygulama sırası

## Hedef stack (özet)

| Alan | Teknoloji |
| --- | --- |
| Mobil | Expo, Expo Router, TypeScript, NativeWind, TanStack Query, RHF + Zod |
| Backend | Supabase (Postgres, Auth, Storage, RLS) |
| Web | Next.js + Tailwind (MVP sonrası) |
| Ortak | date-fns, decimal para formatı (`₺`) |

## MVP kapsamı

Auth → Dashboard → Araçlar → Müşteriler → Kiralamalar → Ödemeler → Teslim/iade → Temel raporlar

## Sonraki adım

**STEP 2:** Supabase migration’lar, enums, RLS, multi-tenant şema, development seed.

## Geliştirme

Henüz `apps/` veya `supabase/` klasörleri oluşturulmadı; STEP 2–3 ile kurulacak.
