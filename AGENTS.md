## Canonical GitHub source and self-hosted Actions (2026-10-22)

GitHub `https://github.com/HallyAus/flatwhiteindex` is authoritative for source, commits and releases. Push to the verified GitHub remote and current project branch, not any retired internal forge or recovery mirror. Preserve local work and never force push. Use the configured self-hosted GitHub Actions runner where available, checking actual job labels, runner trust and workflow configuration. Keep existing release gates, production settings, credentials boundaries, rollback, stage/promotion and live validation. Neither a push nor green CI alone proves deployment. Historical source-control instructions below are superseded.

# Flat White Index source and production

Read CLAUDE.md before changes. GitHub HallyAus/flatwhiteindex is authoritative; master is production. Preserve local work and exclude M4T/employer resources. Keep the existing Vercel release safety checks.

Existing personal Vercel project prj_Y3gIgq8bSrJ60hjhxDJs28yw63gP (flatwhiteindex), team_xyQ79UW6Bz7wt6O8KsL2NuRO, Node.js 22.x, syd1. The personal-ubuntu release runner still executes the CLI on Node 24. Use VM301 personal-ubuntu capacity one and this repository's VERCEL_TOKEN only. No user/org/instance secrets.

Manual runner364 passed exact-source checks, existing Production prebuild, protected static-page acceptance, same-ID promotion and public/alias/error checks. Both existing dispatch schedules followed the accepted production deployment; no call/cron was invoked as a test. The historical provider Git connection was disconnected during the former cutover; verify current integrations instead of assuming a push deploys. For master pushes, verify the currently configured GitHub release route; prove the first actual push before claiming automatic deployment. Refuse a restored Git link, keep schedules on old production until promotion and verify them on the promoted ID. Generated settings/output are cleaned and never uploaded as artifacts.

Never make live voice calls without explicit approval. Do not invoke dispatch, digest, newsletters, Google Places discovery or other live writes as tests. Preserve both existing cron definitions, provider configuration, survey data and Supabase-backed limits. Public smoke checks use only static HTML; they do not call /api/dashboard because it writes a rate-limit row.

Release-provider refusal/rollback tests use mocks and no network/credentials. They do not claim database/RLS or live delivery verification. Keep existing dependency pins; separate dependency alerts and application limitations from migration evidence.
