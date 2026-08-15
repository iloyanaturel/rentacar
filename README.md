# RentaFlow

Profesyonel, mobil öncelikli **araç kiralama yönetim sistemi**.

## Durum

**STEP 4 tamamlandı:** Araç yönetimi (liste, ekleme, düzenleme, detay, fotoğraf, KM, soft delete).

```bash
cp apps/mobile/.env.example apps/mobile/.env
# Supabase URL/anon key + db push

cd apps/mobile && npx expo start
```

```bash
npm run test:step3   # typecheck + unit
npm run db:test      # migrations + RLS/vehicle RPC tests
```

## Sonraki adım

**STEP 5:** Müşteri modülü.
