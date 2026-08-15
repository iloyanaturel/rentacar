# RentaFlow — Final production checklist (STEP 10)

## Infrastructure
- [ ] Dedicated production Supabase project
- [ ] Migrations applied on empty DB (verified locally via `run-db-tests.sh`)
- [ ] `seed.sql` NOT applied
- [ ] PITR / automated backups enabled
- [ ] Auth email templates + SMTP
- [ ] Storage policies verified (private buckets)
- [ ] Edge Function `refresh-notifications` deployed + cron
- [ ] Edge Function `invite-user` deployed
- [ ] Separate Dev vs Prod anon keys in EAS secrets

## Security
- [ ] RLS FORCE on all tenant tables
- [ ] Cross-org tests green
- [ ] Role denial (STAFF ↔ reports/users) green
- [ ] No service_role in mobile
- [ ] No secrets in git
- [ ] Signed URLs for documents/images

## Product smoke
- [ ] Auth (login / logout / reset / verify)
- [ ] Invite email received
- [ ] Full rental financial flow
- [ ] PDF snapshot immutability
- [ ] CSV/Excel/PDF export Turkish chars
- [ ] Push on real device
- [ ] Reports vs manual calc sample

## Mobile release
- [ ] `eas build` Android production
- [ ] `eas build` iOS production
- [ ] App icon / splash / permissions
- [ ] Privacy + Terms live URLs
- [ ] Support email
- [ ] Store screenshots
- [ ] Sentry DSN + test event
- [ ] Analytics key (optional)

## Release candidate
- [ ] Tag / channel `1.0.0-rc.1`
- [ ] Smoke path completed on RC
- [ ] No BLOCKER issues open
