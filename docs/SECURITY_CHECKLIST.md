# Security checklist (STEP 9)

- [x] RLS enabled on tenant tables (FORCE where applied)
- [x] Organization isolation via `get_user_organization_id()` (ACTIVE users only)
- [x] Role permissions via `get_user_permissions()` + frontend `can()`
- [x] Service role key not used in mobile client
- [x] Secrets gitignored (`.env`, `.env.*` except `.env.example`)
- [x] Storage branding path under `{orgId}/branding/` on `documents` bucket
- [x] Auth: password reset, email change via Supabase Auth
- [x] Email verification warning in profile
- [x] Session logout + global sign-out hooks
- [x] PII redaction in `logger`
- [x] Audit events without raw phone/email values for invites/profile
- [x] Parameterized RPCs (no string-concat SQL)
- [x] SECURITY DEFINER RPCs check `auth.uid` / role helpers
- [ ] Production Sentry DSN (optional until configured)
- [ ] Supabase Auth invite email Edge Function for real invite delivery
