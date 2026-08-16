# RentaFlow Web Panel

Next.js App Router paneli; Expo mobil ile aynı Supabase şemasını kullanır.

## Çalıştırma

1. `apps/web/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. `npm run dev:web`
3. Giriş: mevcut auth kullanıcı (ör. owner)

## Vercel

- Root Directory: `apps/web`
- Install: monorepo için `cd ../.. && npm install` (veya Vercel npm workspaces algılaması)
- Env: `NEXT_PUBLIC_*` değişkenleri
- Build: `npm run build` (workspace) veya `next build`

## Modül eşlemesi

Mobil feature route’ları web’de sidebar + App Router path’lerine taşındı (`/dashboard`, `/vehicles`, `/rentals/...` vb.).
