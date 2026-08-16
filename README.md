# RentaFlow

Profesyonel, mobil öncelikli **araç kiralama yönetim sistemi** (işletme operasyonları — marketplace değil).

## Durum

**STEP 2 tamamlandı:** Supabase/Postgres şema, RLS, RPC’ler, storage bucket’ları, seed ve DB testleri.

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — monorepo ve mimari
- [docs/DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md) — STEP sırası
- [docs/DATABASE.md](./docs/DATABASE.md) — migration / seed / test kullanımı

## Hedef stack (özet)

| Alan | Teknoloji |
| --- | --- |
| Mobil | Expo, Expo Router, TypeScript, NativeWind, TanStack Query, RHF + Zod |
| Backend | Supabase (Postgres, Auth, Storage, RLS) |
| Web | Next.js + Tailwind (MVP sonrası) |
| Ortak | `@rentaflow/shared` tipleri, date-fns, `₺` formatı |

## MVP kapsamı

Auth → Dashboard → Araçlar → Müşteriler → Kiralamalar → Ödemeler → Teslim/iade → Temel raporlar

## Database komutları

```bash
npm run db:test          # lokal Postgres üzerinde migration + STEP 2 testleri
npx supabase db reset    # Docker ile local Supabase (migrations + seed)
```

## Sonraki adım

**STEP 3:** Expo mobil iskelet + Authentication (login / session / guard).

## Ortam değişkenleri

`.env.example` dosyasını kopyalayın. Service role key client’a konmaz.
