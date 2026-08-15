# STEP 10 — Production cutover runbook

Feature freeze: no new product features. Stability → Security → Data integrity → Performance → UX.

## 1. Environments

| Env | Supabase | Mobile env |
|-----|----------|------------|
| Development | Dev project | `EXPO_PUBLIC_APP_ENV=development` |
| Preview / RC | Staging project (recommended) | `preview` |
| Production | **Dedicated** prod project | `production` |

Do **not** share a single Supabase project between production users and local seed data.

## 2. Production Supabase checklist

1. Create new Supabase project (EU region preferred for TR latency).
2. Enable **PITR / daily backups** (Pro plan).
3. Apply migrations in order (`supabase/migrations/*.sql`) — verify with empty DB:
   ```bash
   bash scripts/run-db-tests.sh
   ```
4. **Do not** run `supabase/seed.sql` on production.
5. Configure Auth:
   - Site URL / redirect URLs for `rentaflow://`
   - Email confirmation ON
   - SMTP / custom templates (reset, invite, verify)
6. Storage buckets created by migration (`vehicle-images`, `rental-images`, `documents`, `avatars`) — all private + signed URLs.
7. Deploy Edge Functions:
   - `refresh-notifications` + Dashboard Cron (every 15 min) + `CRON_SECRET`
   - `invite-user` (Auth Admin invite)
8. Set secrets: `SUPABASE_SERVICE_ROLE_KEY` only in Edge/CI — never in Expo.

## 3. Mobile EAS

```bash
cd apps/mobile
eas login
# set eas.projectId in app.json
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://PROD.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon>
eas secret:create --name EXPO_PUBLIC_APP_ENV --value production
# optional: EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_ANALYTICS_KEY

eas build --platform android --profile production
eas build --platform ios --profile production
```

Profiles: `apps/mobile/eas.json` → development / preview / production.

## 4. Store

See `docs/STORE_PREPARATION.md` + screenshot checklist below.

**Blockers before submit:** live Privacy Policy URL, Terms URL, support email, counsel-approved legal copy.

## 5. Monitoring

1. Set `EXPO_PUBLIC_SENTRY_DSN` and install `@sentry/react-native` (native rebuild).
2. Send a test exception; confirm release `rentaflow@1.0.0`.
3. Optional analytics key → `lib/analytics.ts` events (no PII).

## 6. Smoke test (RC)

Register → Login → Onboarding → Vehicle → Customer → Rental → Payment → Handover → Return → Deposit → Complete → Maintenance → Expense → Reports → PDF → Export → Notification → Logout.

## 7. Rollback

- Disable store rollout / halt submit
- Revert EAS channel update if OTA
- DB: restore from PITR (no in-app backup button)
