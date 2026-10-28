# Auth staging verification — 27 October 2026

Status: blocked on an available, independently confirmed staging database and staging Google OAuth configuration. No production connection, deployment, migration, seed command, or data cleanup was performed.

## Evidence from this checkout

- Reviewed the pending changes in `src/app/actions/auth.ts`, `src/lib/auth.ts`, and `SAAS_RELEASE_PLAN.md`.
- Phone registration now writes `phoneVerified: false` and `phoneVerifiedAt: null`; phone/password login remains supported while SMS OTP is disabled.
- New Google accounts now run sample seeding inside the account/organization/lake/membership transaction. Existing accounts bypass that transaction.
- `.env.test` names the local database `quanlihocau_test` at `127.0.0.1:55432`. A TCP-only probe returned `ECONNREFUSED`; no SQL connection was made. The listener at port 5432 was not investigated or used because its isolation is unknown.
- Default `.env` contains a cloud database target. It was not connected to. Do not run the app with default environment resolution for these checks.
- Regression tests use dependency mocks, not a database or OAuth provider. They cannot establish PostgreSQL rollback, provider redirects, or browser-cookie compatibility.

## Smallest safe staging procedure

1. Supply a dedicated, schema-ready staging database containing synthetic data only, with a role restricted to that database. Confirm its provider branch/database identity independently; a database name containing “test” alone is insufficient. Record that identity without credentials. No production clone or production cookie/account fixtures. This auth diff needs no schema migration. If schema preparation is required, stop and review it separately; do not reset or use broad seed scripts.
2. Start a separate staging app process with `DATABASE_URL` explicitly set to that confirmed database; set `TEST_DATABASE_URL` to the same target for tests that require it. Use a separate staging URL/port and staging-only auth secrets. Keep those secrets stable across the before/after compatibility check. Explicitly supply staging Google client credentials and register the staging `/api/auth/callback/google` redirect URI. Check `.env`, `.env.local`, and inherited variables cannot supply production database, Google, SMS, bank, or webhook credentials. Disable real outbound integrations. Do not start the app until the effective environment is confirmed; `--env-file` alone does not prove that the app and test runner share a database.
3. Before applying the pending auth diff to the staging process, create synthetic existing owner/staff fixtures with the baseline code. Keep browser sessions open (both `qa_session` credentials and NextAuth Google cookies). Record fixture IDs, membership IDs, phone verification fields, and session versions. After restarting with this diff and the same staging secrets/URL, confirm both sessions still open their original lake without logging in again. Re-login the synthetic staff by email and normalized phone; retain its current permissions. Confirm a synthetic locked account and a revoked session remain denied. Never change a real account to test revocation.
4. Register a new synthetic phone-only owner through `/register` using a unique phone and lake name. Confirm redirect to login, no authenticated session from signup alone, normalized `+84` phone, synthetic email, `phoneVerified=false`, and `phoneVerifiedAt=NULL`. Log in by phone/password and open the new lake. Repeat with email plus phone; check duplicate phone/email rejection adds no extra owner/lake. OTP endpoints should return 410 without sending SMS. Use unique fixture identifiers per run and leave fixtures in place; no cleanup deletes.
5. For each new phone lake, inspect only its recorded IDs using read-only queries or a staging-only database viewer. Expect one organization, one lake, one OWNER membership, one area, ten huts, two packages, five products with five initial inventory movements, two fish types, and default financial categories/cash account. Expect no fishing sessions, invoices, or payments. Check inventory quantities (50/50/50/20/20). Do not infer success from a nonempty dashboard alone.
6. Sign in through the actual Google consent/redirect flow with a dedicated test Google identity never used in this staging database. Verify the same sample data and OWNER/trial relationships as step 5. Sign out and repeat Google sign-in; IDs and sample counts must remain unchanged. Repeat with an existing synthetic owner; no new organization/lake/sample data may appear. Staff Google access must retain the existing credentials-only restriction. Keep cookies and OAuth tokens out of logs/reports.
7. Verify real PostgreSQL rollback separately: in a staging-only integration harness invoke the actual sign-in callback and real sample seeder with a transaction-scoped injected failure after sample rows have been written. Do not add a public failure endpoint or change persistent database constraints. Require sign-in denial and zero rows for that run's owner email and recorded organization/lake IDs after rollback. Retry without injection and require exactly one complete lake. The mock regression only proves that the error escapes the transaction callback; it does not prove database rollback. Phone signup should receive the equivalent transaction failure check.
8. Recheck the synthetic baseline owner/staff records and their lake counts after all signup cases. Record timestamp, revision/diff, target identity, fixture IDs, observed counts, browser-cookie results, and failures. Keep release-plan staging checkboxes open until the real database and browser checks pass. Broader operational/tenant integration checks remain separate release gates.

## Safe local regression command

This command does not load `.env` or call external services:

```powershell
node --test --test-timeout=15000 tests/app-regressions.test.mjs tests/stale-session.test.mjs tests/outdoor-and-quick-open.test.mjs
```

Do not run `npm test` or existing API suites indiscriminately: several use live HTTP/database connections and their target guards do not establish app/database isolation. `register.integration.test.mjs` checks account counts but does not prove Google onboarding or existing-cookie compatibility.
