# RentaFlow Web

Next.js (App Router) yönetim paneli — mobil Expo uygulaması ile aynı Supabase backend’ini kullanır.

## Geliştirme

```bash
# monorepo kökünden
cp apps/web/.env.example apps/web/.env.local
# NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY doldurun

npm install
npm run dev:web
# http://localhost:3000
```

## Build / Vercel

- Framework: Next.js
- Root Directory (Vercel): `apps/web` **veya** monorepo install ile `vercel.json` kullanın
- Ortam değişkenleri:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_APP_ENV=production`

```bash
npm run build:web
npm run start:web
```

## Modüller

Özet, takvim, araçlar, müşteriler, kiralamalar (teslim / iade / ödeme), ödemeler, masraflar, bakım, raporlar, bildirimler, ayarlar, profil.

Responsive: mobil drawer + masaüstü sidebar.
