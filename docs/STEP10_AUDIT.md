# STEP 10 — Production audit findings

Generated for release candidate **1.0.0-rc.1**.

## Secret audit

| Finding | Severity | Notes |
|---------|----------|-------|
| No live service_role / private keys in app source | OK | Only placeholders in `.env.example` |
| `.env` / `.env.*` gitignored | OK | Root + mobile |
| Git-tracked env files | OK | Only `.env.example` |
| `xlsx` npm advisory (high, no fix) | HIGH | Export dependency; isolate usage; watch SheetJS updates |
| Expo transitive moderate/high advisories | MEDIUM | Upstream; track Expo SDK patches |

## RLS audit (actual table names)

All tenant tables: **ENABLE + FORCE RLS**. Checklist mapping:

- `organization_members` → `profiles` (+ `organization_invitations`)
- `deposits` → `rental_deposits`
- `rental_handover` → `rental_handovers`
- `vehicle_maintenance` → `maintenance_records`
- `vehicle_expenses` → `expenses`
- `documents` → storage bucket `documents` + table `vehicle_documents`

Cross-org SELECT denial covered for vehicles, customers, rentals, payments, expenses, maintenance (`08_production_security_tests.sql`).

## Notifications / cron

- Client may call `refresh_operational_notifications` on demand (not a timer for scheduling).
- Production: Edge Function `refresh-notifications` + `refresh_operational_notifications_for_org` (service_role only).
- Cron must be configured in Supabase Dashboard (not yet deployable from this agent without project credentials).

## Seed risk

`supabase/seed.sql` is **local-only**. Cutover runbook forbids applying it to production.

## Builds

EAS config added (`apps/mobile/eas.json`). Actual Android/iOS production binaries require Expo account + store credentials — **not executed in this environment**.

## Supabase MCP / remote project

Supabase MCP requires authentication; no remote production project was provisioned by this agent.
