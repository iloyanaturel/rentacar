# RentaFlow — Production Release Checklist

Use before any store / production Supabase cutover.

## Database
- [ ] All migrations applied cleanly on empty DB (`scripts/run-db-tests.sh`)
- [ ] RLS enabled + FORCE on tenant tables
- [ ] Organization isolation verified
- [ ] Role permissions (`get_user_permissions`) verified
- [ ] Seed / demo users NOT applied to production
- [ ] PITR / daily backups enabled on Supabase Pro (or equivalent)
- [ ] No app-side "backup database" button

## Environment
- [ ] `EXPO_PUBLIC_SUPABASE_URL` set (anon-safe)
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] Service role key NEVER in mobile / Expo public env
- [ ] `.env` / `.env.local` gitignored
- [ ] `.env.example` present without secrets
- [ ] Production debug logs disabled (`logger.debug` no-op in prod)

## Auth & Security
- [ ] Password reset email template configured
- [ ] Email verification enabled
- [ ] Session logout + global sign-out tested
- [ ] Suspended users cannot read org data
- [ ] Last OWNER cannot be demoted / suspended
- [ ] Storage policies for `documents` / vehicle photos
- [ ] No PII in application logs or audit metadata
- [ ] Unsafe RPCs reviewed (SECURITY DEFINER + auth.uid checks)

## Product
- [ ] Business settings (currency, tax, locale, timezone)
- [ ] Rental pricing snapshots on create
- [ ] Contract text snapshot on create
- [ ] User invite + roles
- [ ] Reports permission gated (UI + RPC)
- [ ] Onboarding flow
- [ ] Legal placeholders replaced with counsel-approved copy
- [ ] Error tracking DSN configured (Sentry or equivalent)
- [ ] Push notifications production credentials
- [ ] PDF / CSV / Excel exports smoke-tested

## Mobile store
- [ ] App name: RentaFlow
- [ ] Version `1.0.0` (see `apps/mobile/config/app.ts` + `app.json`)
- [ ] App icon + splash finalized
- [ ] Android production build (`eas build -p android --profile production`)
- [ ] iOS production build / TestFlight
- [ ] Privacy policy URL live
- [ ] Support URL / email live
- [ ] Store listing screenshots prepared (see `docs/STORE_PREPARATION.md`)

## Scorecard (fill after QA)
```
Architecture: __/100
Security: __/100
Performance: __/100
UX: __/100
Database: __/100
Mobile: __/100
Production Readiness: __/100
```
