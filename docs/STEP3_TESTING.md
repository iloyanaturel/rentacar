# STEP 3 auth/navigation smoke checklist
# Run with Supabase project linked + demo user that has a profiles row.

## Manual / device

1. App opens without white flash (splash/brand loading)
2. Unauthenticated → Login
3. Wrong password → Turkish error
4. Valid login → Dashboard
5. Kill & reopen → session persists
6. Logout confirm → Login
7. Dashboard KPIs load from RPC (or ErrorState + retry if offline)
8. Today returns / upcoming sections show EmptyState when empty
9. Profile shows name, email, role, org
10. Tabs: Ana Sayfa / Araçlar / Kiralamalar / Müşteriler / Daha Fazla

## Automated (CI / local)

```bash
npm run test:step3
# typecheck shared + mobile, unit tests (currency, zod, errors)
```
