# RentaFlow — Mimari Plan

> STEP 1 çıktısı. Uygulama kodu henüz yazılmamıştır; bu belge monorepo yapısını, veri modelini ve katman sorumluluklarını tanımlar.

## 1. Proje Analizi

| Durum | Detay |
| --- | --- |
| Repo | `iloyanaturel/rentacar` — boş (yalnızca placeholder README) |
| Mevcut kod | Yok |
| Karar | Greenfield monorepo kurulumu |

## 2. Monorepo Yapısı

```
rentaflow/
├── apps/
│   ├── mobile/                 # Expo + Expo Router (MVP öncelik)
│   └── web/                    # Next.js yönetim paneli (sonraki aşama)
├── packages/
│   └── shared/                 # Ortak types, Zod şemaları, utils (para/tarih)
├── supabase/
│   ├── migrations/             # SQL migration dosyaları
│   ├── seed/                   # Development-only demo data
│   ├── functions/              # Edge Functions (gerekirse)
│   └── config.toml
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT_PLAN.md
├── .env.example
├── .gitignore
├── package.json                # Workspace root (npm/pnpm workspaces)
└── README.md
```

### Neden monorepo?

- Mobil ve web aynı Supabase şemasını / enum’ları paylaşır.
- `packages/shared` ile para formatı, tarih helpers ve Zod şemaları tek yerde tutulur.
- Migration’lar tek kaynaktan yönetilir.

## 3. Teknoloji Stack (Kilitleme)

| Katman | Teknoloji | Not |
| --- | --- | --- |
| Mobil | Expo (SDK güncel stable), Expo Router, TypeScript strict | Android + iOS |
| Stil | NativeWind v4 | Tailwind yaklaşımı |
| State / server | TanStack Query | Cache + pagination |
| Form | React Hook Form + Zod | Türkçe validation mesajları |
| Backend | Supabase (Postgres, Auth, Storage, RLS) | Edge Functions yalnızca gerektiğinde |
| Grafik | `react-native-gifted-charts` (mobil) / Recharts (web) | RN uyumlu |
| Tarih | date-fns + date-fns-tz | `Europe/Istanbul` |
| Web | Next.js + Tailwind | MVP sonrası |

## 4. Feature-Based Mimari (Mobile)

```
apps/mobile/
├── app/                        # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── index.tsx           # Dashboard
│   │   ├── vehicles/
│   │   ├── rentals/
│   │   ├── customers/
│   │   └── more/
│   └── _layout.tsx
├── components/                 # UI primitives (Button, Input, Card, ...)
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── vehicles/
│   ├── customers/
│   ├── rentals/
│   ├── payments/
│   ├── expenses/
│   ├── maintenance/
│   ├── reports/
│   ├── notifications/
│   └── settings/
├── services/                   # Merkezi data layer (Supabase çağrıları)
├── lib/                        # supabase client, queryClient, errors
├── hooks/
├── types/
├── utils/                      # formatCurrency, formatDate, ...
└── constants/
```

### Katman kuralları

1. **Screens** → feature hooks / components çağırır; doğrudan Supabase yazılmaz.
2. **Services** → tek Supabase erişim noktası (`vehiclesService`, `rentalsService`, …).
3. **Types / Zod** → DB enum’ları ile birebir uyumlu; `packages/shared` tercih edilir.
4. **UI components** → presentational; iş kuralı içermez.

## 5. Multi-Tenant Veri Modeli

```
organizations
    └── profiles (user_id ↔ auth.users, role, organization_id)
            └── vehicles | customers | rentals | payments
                | expenses | maintenance_records | notifications
                | audit_logs | settings
```

Tüm tenant verisi `organization_id` ile izole edilir. RLS politikaları bu kolona dayanır.

### Temel tablolar (MVP)

| Tablo | Amaç |
| --- | --- |
| `organizations` | Firma / tenant |
| `profiles` | Kullanıcı profili + `user_role` |
| `organization_settings` | Firma adı, para birimi, varsayılanlar |
| `vehicles` | Araç envanteri (`deleted_at`) |
| `vehicle_photos` | Storage referansları |
| `customers` | Müşteriler (`deleted_at`) |
| `rentals` | Kiralamalar + çakışma koruması |
| `rental_photos` | Teslim/iade görselleri |
| `payments` | Ödeme kayıtları + audit alanları |
| `expenses` | Araç masrafları |
| `maintenance_records` | Bakım |
| `notifications` | Uygulama içi bildirimler |
| `audit_logs` | Kritik işlem izi |

### Enums

- `user_role`: `ADMIN` | `STAFF`
- `vehicle_status`: `AVAILABLE` | `RENTED` | `MAINTENANCE` | `INACTIVE`
- `rental_status`: `RESERVED` | `ACTIVE` | `COMPLETED` | `CANCELLED` | `OVERDUE`
- `payment_method`: `CASH` | `CREDIT_CARD` | `BANK_TRANSFER` | `OTHER`
- `payment_status`: `PAID` | `PARTIALLY_PAID` | `UNPAID` (kiralama üzerinde hesaplanan / saklanan)
- `expense_category`: `MAINTENANCE` | `FUEL` | `INSURANCE` | `CASCO` | `TAX` | `TIRE` | `REPAIR` | `CLEANING` | `OTHER`
- `maintenance_type`: `PERIODIC` | `OIL_CHANGE` | `TIRE` | `BRAKE` | `BATTERY` | `INSPECTION` | `OTHER`
- `fuel_type`, `transmission_type` (araç formu)

### Para ve tarih

- DB: `numeric(12,2)` — floating point yok.
- UI: `formatCurrency(n)` → `2.500,00 ₺`
- Tarih gösterimi: `DD.MM.YYYY` / saat `HH:mm`
- Timezone: `Europe/Istanbul`

## 6. Kritik İş Kuralları (Schema Seviyesi)

### Kiralama çakışması

Frontend kontrolü yeterli değildir. Migration’da:

1. Exclusion constraint / `tstzrange` overlap kontrolü **veya**
2. `SECURITY DEFINER` fonksiyon + transaction içinde `FOR UPDATE` kilidi

Hedef: aynı araç için çakışan `RESERVED`/`ACTIVE`/`OVERDUE` aralıkları engellenir (race-safe).

### Araç durumu geçişleri

| Olay | Araç durumu |
| --- | --- |
| Kiralama ACTIVE | → `RENTED` |
| Teslim tamamlandı | → `AVAILABLE` (açık ödeme uyarısı gösterilir; ödeme durumu korunur) |
| Bakım kaydı (iş kuralı) | → `MAINTENANCE` (MVP’de manuel veya opsiyonel) |

### Soft delete

`vehicles`, `customers`, `rentals` → `deleted_at`. Finansal kayıtlar (`payments`, `expenses`) fiziksel silme yerine iptal/void yaklaşımı.

## 7. Auth & RLS

- Supabase Auth: email/password, session persistence (Expo SecureStore).
- Login olmadan `(tabs)` erişimi yok (`app` layout guard).
- RLS: `auth.uid()` → `profiles.organization_id` eşleşmesi.
- `ADMIN`: tam erişim; `STAFF`: operasyonel CRUD, ayarlar / kritik raporlar kısıtlı.
- Service role key **asla** client’a konmaz.

## 8. Storage Buckets

| Bucket | İçerik |
| --- | --- |
| `vehicle-images` | Araç fotoğrafları |
| `rental-images` | Teslim/iade fotoğrafları |
| `documents` | Fatura / belge |

Bucket politikaları `organization_id` path prefix veya metadata ile kısıtlanır.

## 9. Services API (örnek imzalar)

```ts
vehiclesService.getVehicles({ search, status, page, pageSize })
vehiclesService.getVehicle(id)
vehiclesService.createVehicle(input)
vehiclesService.updateVehicle(id, input)

customersService.getCustomers({ search, page })
customersService.createCustomer(input)

rentalsService.createRental(input)       // overlap + status transaction
rentalsService.completeRental(id, handover)
rentalsService.getRentals({ filters, page })

paymentsService.createPayment(input)
paymentsService.getPayments({ rentalId })

dashboardService.getSummary()            // aggregation DB tarafında
reportsService.getFinancialReport(range)
```

## 10. Navigasyon (Mobile)

Bottom tabs:

1. Ana Sayfa (Dashboard)
2. Araçlar
3. Kiralamalar
4. Müşteriler
5. Daha Fazla → Ödemeler, Masraflar, Bakım, Raporlar, Bildirimler, Ayarlar, Profil, Çıkış

## 11. UX & Tasarım İlkeleri

- Açık arka plan, koyu metin, sınırlı vurgu rengi (kurumsal teal/slate — purple/glow yok).
- Türkçe UI; İngilizce kod isimleri.
- Her form: loading / error / empty / success toast.
- Empty state metinleri Türkçe ve aksiyon odaklı.

## 12. Güvenlik Checklist

- [ ] `.env` gitignore; `.env.example` commit
- [ ] Anon key client; service role yalnızca sunucu/CI
- [ ] RLS tüm tablolarda açık
- [ ] Hassas müşteri alanları (TC, ehliyet) liste ekranlarında maskeli / gizli
- [ ] Audit log kritik mutasyonlarda

## 13. Bilinçli olarak MVP dışı bırakılanlar

WhatsApp, SMS, push, online ödeme, marketplace, AI, çoklu şube, PDF/e-imza, GPS, SaaS abonelik — mimari genişlemeye açık, implementasyon yok.

## 14. Sonraki Adım

→ **STEP 2**: Supabase schema + migration + RLS + seed (dev-only)  
→ Ardından STEP 3 Auth ile mobil iskelet kurulumu
