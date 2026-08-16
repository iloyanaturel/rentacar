# RentaFlow

Profesyonel **araç kiralama yönetim sistemi** — monorepo.

## Uygulamalar

| App | Stack | Komut |
| --- | --- | --- |
| `apps/web` | Next.js + Tailwind + Supabase | `npm run dev:web` |
| `apps/mobile` | Expo + Expo Router | `cd apps/mobile && npx expo start` |

Ortak backend: Supabase (RLS + RPC). Tipler: `packages/shared`.

## Web (önerilen masaüstü panel)

```bash
cp apps/web/.env.example apps/web/.env.local
# NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev:web
# http://localhost:3000
```

Vercel: proje root’u `apps/web` veya monorepo `vercel.json` (`apps/web/vercel.json`). Ortam değişkenlerini Vercel’e ekleyin.

```bash
npm run build:web
npm run typecheck:web
```

## Mobil

```bash
cp apps/mobile/.env.example apps/mobile/.env
cd apps/mobile && npx expo start
```
