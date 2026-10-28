# SEO Huân Trần — 28/10/2026

Published profile: https://quanlihocau.com/huan-tran

Vercel project: `huan-tran-v2/quanlihocau-v2-m9em`.
Deployment: `dpl_NgSnfJT92uGu8ZUKzgrRcVpE79Kt`.
Deployment URL: https://quanlihocau-v2-m9em-qdh3kmari-huan-tran-v2.vercel.app

## Published scope

The production release was prepared from committed baseline
`2bbdce559ccd52f73ebb4798c061ecf911bec509`, with only these changes:

- `src/app/huan-tran/page.tsx`: founder profile, visible story and social links,
  metadata, canonical, ProfilePage and breadcrumb structured data.
- `src/lib/founder.ts`: shared Person entity and supplied public links.
- `src/app/layout.tsx`: founder authorship and Organization/SoftwareApplication relationships.
- `src/app/page.tsx`: homepage description and application creator reference.
- `src/app/sitemap.ts`: profile URL and corresponding content update date.
- `src/components/landing/official-landing-page.tsx`: visible founder section and internal link.

Other uncommitted workspace changes were excluded. No migration, seed, database
write, authentication change, environment-variable change, dependency update or
session-secret rotation was performed. Existing application build commands run
Prisma Client generation, not database migration.

## Validation

- Vercel production build and TypeScript completed; deployment reached READY.
- ESLint passed for the founder files and updated landing component.
- Validated rendered title, canonical, single H1, indexability, JSON-LD parsing,
  Person identity, Facebook sameAs, breadcrumbs and all four supplied social links.
- Verified homepage discovery link and sitemap entry.
- Public HTTP 200: `/huan-tran`, `/`, `/sitemap.xml`, `/robots.txt`, `/login`,
  `/register`, `/bang-gia`.
- Opened the public founder page in the browser and reviewed its layout.
- Google Search Console confirmed “Đã yêu cầu lập chỉ mục”; URL added to the
  priority crawl queue. This confirms request submission, not completed indexing.
- Submitted the updated `/sitemap.xml` in Search Console; Google confirmed
  “Đã gửi sơ đồ trang web thành công” and the sitemap showed 8 discovered pages.
- Indexing-request screenshot: `scratch/google-huan-tran-indexing-request.png`.

The video AI history is presented as the founder's account. No awards, ranking,
client names, dates of projects, or unsupported market exclusivity were invented.

## Recovery and source

Previous production deployment: `dpl_FtMtGSRRpg7GCFExWacMMYsPWhwt`.
Previous URL: https://quanlihocau-v2-m9em-3tccupxpj-huan-tran-v2.vercel.app

If an application regression requires rollback, use the previous deployment in
Vercel; do not run a database rollback or change session secrets.

The exact SEO-only upload is retained locally in `scratch/seo-huan-tran-release/`.
The main workspace preserves ongoing work; its current homepage uses the newer
brand landing component, which already contains the founder section. A future
release should retain the profile, metadata, entity links and sitemap entry.

Google indexing and rankings remain determined by Google. No publishing to the
founder's social accounts, no Bing submission, and no AI knowledge-base inclusion
is claimed by this release.
