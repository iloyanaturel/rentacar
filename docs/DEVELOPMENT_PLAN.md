# RentaFlow — Geliştirme Planı

Her adımda: kod → TypeScript → lint/build → schema-model uyumu → UX.  
Çalışmayan sahte özellik yok. Mock kullanılıyorsa kodda açıkça işaretlenir.

---

## STEP 1 — Proje analizi ve mimari planlama ✅

**Durum:** Tamamlandı (bu belge + `ARCHITECTURE.md`)

**Çıktılar:**
- Mevcut repo analizi (boş greenfield)
- Monorepo + feature mimarisi
- Veri modeli / RLS / iş kuralları taslağı
- Sıralı geliştirme planı

**Test/build:** Uygulanabilir kod yok.

---

## STEP 2 — Database schema ✅

**Durum:** Tamamlandı

**Çıktılar:**
- `supabase/migrations/` — enums, tablolar, indexler, functions/triggers, RLS, storage, reporting views
- `supabase/seed.sql` — development-only demo data
- `packages/shared` — Database TypeScript types
- `scripts/run-db-tests.sh` + `supabase/tests/` — 10 senaryo + depozito kontrolü
- `.env.example`, `docs/DATABASE.md`

**Doğrulama:** `npm run typecheck:shared` ✅ · `npm run db:test` ✅ (Test 1–10 PASS)

---

## STEP 3 — Proje kurulumu + Authentication

**Hedef:**
- Monorepo root + `apps/mobile` (Expo Router, NativeWind, TanStack Query, RHF, Zod)
- `packages/shared` (types, currency/date utils, Zod ortak şemalar)
- Supabase client + SecureStore session
- Login / şifremi unuttum / çıkış
- Auth guard (login olmadan tabs yok)
- Ortak UI: Button, Input, Card, Badge, EmptyState, LoadingState, ErrorState
- `.env.example`, `.gitignore`

**Doğrulama:** `tsc --noEmit`, Expo typecheck; auth flow smoke (env varsa).

---

## STEP 4 — Dashboard

**Hedef:**
- KPI: toplam / müsait / kirada / bakımda
- Finansal kartlar: bugünkü ciro, ay ciro, tahsil, bekleyen
- Operasyon: bugün/yarın teslim, yaklaşan
- Listeler: bugünkü teslimler, yaklaşan 7 gün
- Araç durumu grafiği
- `dashboardService` — aggregation mümkün olduğunca SQL/view veya RPC

**Doğrulama:** Boş org empty state; seed ile dolu state.

---

## STEP 5 — Araç modülü

**Hedef:**
- Liste: arama (plaka/marka/model), durum filtresi, kart UI
- Oluştur / düzenle formu (Zod TR mesajları), plaka unique
- Detay: genel + finansal özet + geçmiş kiralamalar + bakım + masraf sekmeleri
- Fotoğraf upload (Storage) — bucket hazır değilse açıkça disabled + not

**Doğrulama:** CRUD + soft delete; RLS izolasyonu (mümkünse manuel).

---

## STEP 6 — Müşteri modülü

**Hedef:**
- Liste + arama (ad/soyad/telefon)
- Oluştur / düzenle; hassas alanlar detayda
- Detay: istatistikler + kiralama geçmişi

**Doğrulama:** Validasyon; TC/ehliyet liste ekranında gösterilmez.

---

## STEP 7 — Kiralama modülü

**Hedef:**
- 3 adımlı wizard: araç (yalnızca AVAILABLE) → müşteri → tarihler/fiyat
- Otomatik gün × fiyat hesabı + indirim/ek ücret/depozito
- DB seviye çakışma kontrolü; hata mesajı TR
- Durumlar: RESERVED / ACTIVE / COMPLETED / CANCELLED / OVERDUE
- Liste filtre: tarih, durum, araç, müşteri, ödeme durumu

**Doğrulama:** Çakışan iki create denemesi; race senaryosu (fonksiyon/constraint).

---

## STEP 8 — Ödeme modülü

**Hedef:**
- Ödeme CRUD (liste + kiralama üzerinden ekleme)
- Yöntemler: Nakit, KK, Havale/EFT, Diğer
- Audit: `created_by`, `created_at`
- Kiralama `payment_status`: PAID / PARTIALLY_PAID / UNPAID (tetikleyici veya service)

**Doğrulama:** Kısmi ödeme → PARTIALLY_PAID; tam → PAID.

---

## STEP 9 — Teslim / iade

**Hedef:**
- “Aracı Teslim Al” ekranı: tarih/saat, KM, yakıt, hasar notu, ek ücret, geç teslim, foto
- COMPLETED + araç AVAILABLE
- Açık bakiye uyarısı (teslim yine de mümkün)

**Doğrulama:** Ödemeli ve ödemesiz senaryo.

---

## STEP 10 — Temel raporlar

**Hedef:**
- Finans: gelir (kiralanan tutar vs tahsilat ayrı), masraf, net
- Araç: gelir/masraf, gün, doluluk oranı grafiği
- Müşteri: en çok kiralayan / harcayan
- Tarih aralığı seçici

**Doğrulama:** Seed verisi ile tutarlı toplamlar.

---

## Sonraki dalgalar (MVP sonrası)

Sıra önerisi (şimdi implement edilmez):

1. Masraflar + Bakım tam CRUD (MVP’de araç detayında okuma yeterli olabilir; STEP 5–10 sonrası tam ekran)
2. Takvim (gün/hafta/ay)
3. Bildirimler (in-app generator)
4. Ayarlar (firma)
5. `apps/web` Next.js panel
6. Push / PDF / WhatsApp / çoklu şube — ayrı epikler

---

## Kalite kapıları (her STEP)

| Kapı | Komut / yöntem |
| --- | --- |
| TypeScript | `tsc --noEmit` (mobile + shared) |
| Lint | Expo/ESLint config |
| Build | `npx expo export` veya `expo start` typecheck |
| Schema sync | Enum/type diff checklist |
| UX | Loading / empty / error / toast |

---

## Riskler ve mitigasyon

| Risk | Mitigasyon |
| --- | --- |
| Supabase projesi henüz bağlı değil | Migration’lar repo’da; `.env.example`; mock yalnızca açıkça işaretli |
| Exclusion constraint karmaşıklığı | Önce RPC + advisory/row lock; sonra constraint sıkılaştırma |
| Fotoğraf upload env bağımlılığı | Bucket yoksa UI disabled + “yapılandırma gerekli” mesajı |
| Monorepo tooling | npm workspaces ile sade tut; gereksiz Turborepo ekleme (ihtiyaç doğunca) |
