# Vercel’e yayın

## 1) Projeyi bağla

1. https://vercel.com/new aç
2. **Import** → GitHub `iloyanaturel/rentacar`
3. Ayarlar:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`  ← önemli
   - **Branch:** `cursor/rentaflow-web-app-8159` (veya merge sonrası `main`)
4. Install/Build komutları `apps/web/vercel.json` içinden gelir (monorepo `npm install` + `npm run build -w web`)

## 2) Environment Variables

Production / Preview / Development için:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hayctjmoarcqpudjbhpx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key — Dashboard → Project Settings → API) |
| `NEXT_PUBLIC_APP_ENV` | `production` |

## 3) Deploy

**Deploy**’a bas. URL örneği: `https://rentacar-….vercel.app`

## 4) Supabase Auth URL’leri

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://<senin-proje>.vercel.app`
- **Redirect URLs:** `https://<senin-proje>.vercel.app/**` ve `http://localhost:3000/**`

## CLI (token ile)

```bash
cd apps/web
npx vercel login
npx vercel link   # Root Directory: apps/web
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel --prod
```
