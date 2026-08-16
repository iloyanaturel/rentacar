# RentaFlow — Database (STEP 2)

## Apply migrations (linked remote project)

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## Local Supabase (requires Docker)

```bash
npx supabase start
npx supabase db reset   # migrations + seed.sql
```

## Local Postgres tests (no Docker)

```bash
npm run db:test
```

This creates a temporary `rentaflow_test` database, applies stubs + migrations, and runs `supabase/tests/01_core_tests.sql`.

## Seed

`supabase/seed.sql` is **development-only**. It runs on `supabase db reset`, not as a production migration. It does not create `auth.users` — create users in Supabase Auth, then insert matching `profiles`.

## Regenerating TypeScript types

```bash
npx supabase gen types typescript --local > packages/shared/src/database.types.generated.ts
```

Until a project is linked, `packages/shared/src/database.types.ts` is the hand-maintained mirror of migrations.
