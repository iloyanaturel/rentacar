# RentaFlow

Profesyonel, mobil öncelikli **araç kiralama yönetim sistemi** (işletme operasyonları — marketplace değil).

## Durum

**STEP 3 tamamlandı:** Expo mobil iskelet, Authentication, bottom navigation, gerçek Dashboard.

Belgeler:

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/DATABASE.md](./docs/DATABASE.md)
- [docs/DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md)
- [docs/STEP3_TESTING.md](./docs/STEP3_TESTING.md)

## Uygulamayı çalıştırma

```bash
cp apps/mobile/.env.example apps/mobile/.env
# EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY doldurun
# supabase db push ile migration’ları uygulayın

cd apps/mobile && npx expo start
```

## Kontroller

```bash
npm run test:step3    # shared + mobile typecheck + unit tests
npm run db:test       # Postgres migration + RLS/RPC tests
```

## Sonraki adım

**STEP 4:** Araç modülü (liste, arama/filtre, ekleme, detay).
