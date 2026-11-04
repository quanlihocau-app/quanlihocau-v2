# Restore the application used on the morning of 3 November 2026

Requested by the project owner on 4 November 2026 because staff could not use the newer interface and workflows.

All tracked application source under `src/` is restored exactly to commit `bf589f1526a761bc202053c382354435cf530690`, saved at 20:52 on 2 November (Vietnam time). This is the latest commit before the requested morning. Permission tests are restored to the same policy. Existing CI configuration is retained.

No database schema, migration, credentials, account, session secret or business record is changed by this release. Build runs Prisma client generation and Next.js compilation only; no migration or seed is part of deployment. Unreleased SaaS hardening is preserved separately in the original workspace and excluded from this release.

The Vercel deployment from this historical source was already rebuilt successfully as `dpl_59shEHaDeEnKpP6JyCTZmYD3imiY`. This follow-up commit records the restoration in Git so subsequent deployments use the same application source.
