-- RentaFlow development seed
-- Applied only via `supabase db reset` / local seed (NOT production migrations).
-- Does NOT insert into auth.users — expects bootstrap users or test harness to create them.
--
-- This seed creates org + operational demo data with fixed UUIDs for local/dev.
-- Profile rows are skipped unless matching auth.users already exist.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Demo organization
INSERT INTO public.organizations (
  id, name, phone, email, address, currency, timezone
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'RentaFlow Demo Filo',
  '+90 212 000 00 00',
  'demo@rentaflow.local',
  'İstanbul, Türkiye',
  'TRY',
  'Europe/Istanbul'
)
ON CONFLICT (id) DO NOTHING;

-- Second org for multi-tenant isolation demos
INSERT INTO public.organizations (
  id, name, phone, email, currency, timezone
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Anadolu Rent A Car',
  '+90 312 000 00 00',
  'info@anadolu.local',
  'TRY',
  'Europe/Istanbul'
)
ON CONFLICT (id) DO NOTHING;

-- Vehicles (10) for demo org
INSERT INTO public.vehicles (
  id, organization_id, plate, brand, model, model_year, color,
  fuel_type, transmission, current_km, daily_price, deposit_amount, status
) VALUES
  ('v0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 01', 'Renault', 'Clio', 2022, 'Beyaz', 'GASOLINE', 'MANUAL', 42000, 1500, 5000, 'AVAILABLE'),
  ('v0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 02', 'Toyota', 'Corolla', 2023, 'Gri', 'HYBRID', 'AUTOMATIC', 18000, 2200, 7000, 'AVAILABLE'),
  ('v0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 03', 'Fiat', 'Egea', 2021, 'Kırmızı', 'DIESEL', 'MANUAL', 61000, 1400, 4000, 'RENTED'),
  ('v0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 04', 'Volkswagen', 'Passat', 2020, 'Siyah', 'DIESEL', 'AUTOMATIC', 89000, 2800, 9000, 'AVAILABLE'),
  ('v0000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 05', 'Hyundai', 'i20', 2022, 'Mavi', 'GASOLINE', 'AUTOMATIC', 33000, 1600, 4500, 'MAINTENANCE'),
  ('v0000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 06', 'Ford', 'Focus', 2019, 'Beyaz', 'GASOLINE', 'MANUAL', 102000, 1300, 4000, 'AVAILABLE'),
  ('v0000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 07', 'BMW', '320i', 2021, 'Lacivert', 'GASOLINE', 'AUTOMATIC', 45000, 4500, 15000, 'AVAILABLE'),
  ('v0000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 08', 'Mercedes', 'C200', 2022, 'Gümüş', 'GASOLINE', 'AUTOMATIC', 28000, 4800, 16000, 'INACTIVE'),
  ('v0000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 09', 'Peugeot', '208', 2023, 'Turuncu', 'GASOLINE', 'AUTOMATIC', 12000, 1700, 5000, 'AVAILABLE'),
  ('v0000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '34 ABC 10', 'Dacia', 'Duster', 2020, 'Yeşil', 'DIESEL', 'MANUAL', 76000, 1900, 6000, 'AVAILABLE')
ON CONFLICT (id) DO NOTHING;

-- Same plate allowed on different organization
INSERT INTO public.vehicles (
  id, organization_id, plate, brand, model, model_year,
  fuel_type, transmission, current_km, daily_price, deposit_amount, status
) VALUES (
  'v0000000-0000-0000-0000-000000000099',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '34 ABC 01',
  'Renault',
  'Clio',
  2018,
  'GASOLINE',
  'MANUAL',
  90000,
  1200,
  3000,
  'AVAILABLE'
)
ON CONFLICT (id) DO NOTHING;

-- Customers (10)
INSERT INTO public.customers (
  id, organization_id, first_name, last_name, phone, email, national_id, license_number
) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ahmet', 'Yılmaz', '05321110001', 'ahmet@example.com', '11111111111', 'EHL001'),
  ('c0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ayşe', 'Demir', '05321110002', 'ayse@example.com', '22222222222', 'EHL002'),
  ('c0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mehmet', 'Kaya', '05321110003', 'mehmet@example.com', '33333333333', 'EHL003'),
  ('c0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Zeynep', 'Çelik', '05321110004', 'zeynep@example.com', '44444444444', 'EHL004'),
  ('c0000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Can', 'Öztürk', '05321110005', 'can@example.com', '55555555555', 'EHL005'),
  ('c0000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Elif', 'Arslan', '05321110006', 'elif@example.com', '66666666666', 'EHL006'),
  ('c0000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Burak', 'Aydın', '05321110007', 'burak@example.com', '77777777777', 'EHL007'),
  ('c0000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Selin', 'Koç', '05321110008', 'selin@example.com', '88888888888', 'EHL008'),
  ('c0000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Emre', 'Şahin', '05321110009', 'emre@example.com', '99999999999', 'EHL009'),
  ('c0000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Deniz', 'Yıldız', '05321110010', 'deniz@example.com', '10101010101', 'EHL010')
ON CONFLICT (id) DO NOTHING;

-- Rentals (15) — mix of statuses; one ACTIVE on vehicle 3
INSERT INTO public.rentals (
  id, organization_id, vehicle_id, customer_id,
  start_date, start_time, end_date, end_time,
  daily_price, total_days, subtotal, discount_amount, extra_charge, deposit_amount,
  total_amount, paid_amount, remaining_amount, status
) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 20, '10:00', CURRENT_DATE - 15, '10:00', 1500, 5, 7500, 0, 0, 5000, 7500, 7500, 0, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 10, '09:00', CURRENT_DATE - 7, '09:00', 2200, 3, 6600, 200, 0, 7000, 6400, 6400, 0, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003',
   CURRENT_DATE - 2, '09:00', CURRENT_DATE + 3, '09:00', 1400, 5, 7000, 0, 0, 4000, 7000, 3000, 4000, 'ACTIVE'),
  ('r0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004',
   CURRENT_DATE + 1, '10:00', CURRENT_DATE + 4, '10:00', 2800, 3, 8400, 0, 0, 9000, 8400, 0, 8400, 'RESERVED'),
  ('r0000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005',
   CURRENT_DATE - 30, '11:00', CURRENT_DATE - 25, '11:00', 1300, 5, 6500, 0, 500, 4000, 7000, 7000, 0, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000006',
   CURRENT_DATE - 5, '12:00', CURRENT_DATE - 2, '12:00', 4500, 3, 13500, 500, 0, 15000, 13000, 10000, 3000, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000007',
   CURRENT_DATE, '14:00', CURRENT_DATE + 2, '14:00', 1700, 2, 3400, 0, 0, 5000, 3400, 1700, 1700, 'RESERVED'),
  ('r0000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000008',
   CURRENT_DATE + 5, '09:00', CURRENT_DATE + 8, '09:00', 1900, 3, 5700, 0, 0, 6000, 5700, 0, 5700, 'RESERVED'),
  ('r0000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009',
   CURRENT_DATE - 40, '09:00', CURRENT_DATE - 38, '09:00', 1500, 2, 3000, 0, 0, 5000, 3000, 0, 3000, 'CANCELLED'),
  ('r0000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000010',
   CURRENT_DATE - 60, '10:00', CURRENT_DATE - 55, '10:00', 2200, 5, 11000, 0, 0, 7000, 11000, 11000, 0, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 90, '09:00', CURRENT_DATE - 85, '09:00', 2800, 5, 14000, 1000, 0, 9000, 13000, 13000, 0, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002',
   CURRENT_DATE + 10, '09:00', CURRENT_DATE + 12, '09:00', 1300, 2, 2600, 0, 0, 4000, 2600, 0, 2600, 'RESERVED'),
  ('r0000000-0000-0000-0000-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003',
   CURRENT_DATE - 15, '09:00', CURRENT_DATE - 12, '18:00', 4500, 4, 18000, 0, 0, 15000, 18000, 18000, 0, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000004',
   CURRENT_DATE - 25, '08:00', CURRENT_DATE - 22, '08:00', 1700, 3, 5100, 100, 200, 5000, 5200, 5200, 0, 'COMPLETED'),
  ('r0000000-0000-0000-0000-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000005',
   CURRENT_DATE - 8, '10:00', CURRENT_DATE - 6, '10:00', 1900, 2, 3800, 0, 0, 6000, 3800, 2000, 1800, 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- Payments (20) — triggers will refresh totals; seed sets consistent paid amounts already
INSERT INTO public.payments (
  id, organization_id, rental_id, customer_id, amount, payment_method, payment_date, description
) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 7500, 'CREDIT_CARD', now() - interval '15 days', 'Tam ödeme'),
  ('p0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 6400, 'CASH', now() - interval '7 days', 'Tam ödeme'),
  ('p0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 3000, 'BANK_TRANSFER', now() - interval '2 days', 'Kapora / kısmi'),
  ('p0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 4000, 'CASH', now() - interval '25 days', 'Kısmi 1'),
  ('p0000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 3000, 'CREDIT_CARD', now() - interval '24 days', 'Kısmi 2'),
  ('p0000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 10000, 'CREDIT_CARD', now() - interval '2 days', 'Kısmi'),
  ('p0000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000007', 1700, 'CASH', now(), 'Ön ödeme'),
  ('p0000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000010', 11000, 'BANK_TRANSFER', now() - interval '55 days', 'Tam'),
  ('p0000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000001', 13000, 'CREDIT_CARD', now() - interval '85 days', 'Tam'),
  ('p0000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000003', 18000, 'CREDIT_CARD', now() - interval '12 days', 'Tam'),
  ('p0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000004', 5200, 'CASH', now() - interval '22 days', 'Tam'),
  ('p0000000-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000005', 2000, 'OTHER', now() - interval '6 days', 'Kısmi'),
  ('p0000000-0000-0000-0000-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 500, 'CASH', now() - interval '14 days', 'Ek (demo)'),
  ('p0000000-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 100, 'CASH', now() - interval '6 days', 'Ek (demo)'),
  ('p0000000-0000-0000-0000-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 500, 'BANK_TRANSFER', now() - interval '1 days', 'Ek (demo)'),
  ('p0000000-0000-0000-0000-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000010', 200, 'CASH', now() - interval '54 days', 'Ek (demo)'),
  ('p0000000-0000-0000-0000-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000001', 300, 'CASH', now() - interval '84 days', 'Ek (demo)'),
  ('p0000000-0000-0000-0000-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000003', 400, 'CREDIT_CARD', now() - interval '11 days', 'Ek (demo)'),
  ('p0000000-0000-0000-0000-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000004', 150, 'CASH', now() - interval '21 days', 'Ek (demo)'),
  ('p0000000-0000-0000-0000-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000005', 100, 'OTHER', now() - interval '5 days', 'Ek (demo)')
ON CONFLICT (id) DO NOTHING;

-- Expenses (10)
INSERT INTO public.expenses (
  id, organization_id, vehicle_id, category, amount, expense_date, description
) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000001', 'FUEL', 1200, CURRENT_DATE - 12, 'Depo dolumu'),
  ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000002', 'INSURANCE', 8500, CURRENT_DATE - 40, 'Trafik sigortası'),
  ('e0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000003', 'CLEANING', 450, CURRENT_DATE - 3, 'Detaylı temizlik'),
  ('e0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000005', 'MAINTENANCE', 3200, CURRENT_DATE - 5, 'Periyodik bakım'),
  ('e0000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000007', 'TIRES', 9800, CURRENT_DATE - 60, 'Lastik seti'),
  ('e0000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000004', 'CASCO', 12000, CURRENT_DATE - 90, 'Kasko'),
  ('e0000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000006', 'REPAIR', 2100, CURRENT_DATE - 18, 'Fren balata'),
  ('e0000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'TAX', 15000, CURRENT_DATE - 100, 'Şirket MTV / vergi'),
  ('e0000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000009', 'FUEL', 900, CURRENT_DATE - 2, 'Yakıt'),
  ('e0000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000010', 'OTHER', 350, CURRENT_DATE - 1, 'Otopark')
ON CONFLICT (id) DO NOTHING;

-- Maintenance (5)
INSERT INTO public.maintenance_records (
  id, organization_id, vehicle_id, maintenance_type, maintenance_date,
  current_km, service_name, amount, next_maintenance_date, next_maintenance_km, description
) VALUES
  ('m0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000005', 'PERIODIC', CURRENT_DATE - 5, 33000, 'Yetkili Servis', 3200, CURRENT_DATE + 180, 43000, 'Periyodik bakım'),
  ('m0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000001', 'OIL_CHANGE', CURRENT_DATE - 40, 40000, 'Hızlı Yağ', 1800, CURRENT_DATE + 150, 50000, 'Yağ + filtre'),
  ('m0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000007', 'TIRES', CURRENT_DATE - 60, 44000, 'Lastik Dünyası', 9800, NULL, NULL, '4 lastik'),
  ('m0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000006', 'BRAKES', CURRENT_DATE - 18, 101000, 'Usta Fren', 2100, NULL, NULL, 'Balata değişimi'),
  ('m0000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v0000000-0000-0000-0000-000000000004', 'INSPECTION', CURRENT_DATE - 120, 85000, 'TÜVTÜRK', 1200, CURRENT_DATE + 245, NULL, 'Muayene')
ON CONFLICT (id) DO NOTHING;
