# Flat White Index source and production

Read CLAUDE.md before changes. Private hallyaus/flatwhiteindex on VM300 (.130:3000,SSH2222) is source of truth; master is production. Preserve local work. Push Gitea first, then identical GitHub recovery only after its provider Git link is disconnected. Actions stay disabled. M4T/employer resources are excluded.

Existing personal Vercel project prj_Y3gIgq8bSrJ60hjhxDJs28yw63gP (flatwhiteindex), team_xyQ79UW6Bz7wt6O8KsL2NuRO, Node24, syd1. Use VM301 personal-ubuntu capacity one and this repository's VERCEL_TOKEN only. No user/org/instance secrets.

The initial workflow is manual: exact-source credential-free checks, existing Production settings/build, prebuilt stage without domains, protected public acceptance, current-branch guard, same immutable promotion and public/alias/log checks with guarded rollback. Retain the exact working Git link until replacement succeeds, then disconnect it, recover identical commits and enable/prove an actual Gitea push. Generated settings/output are cleaned and never uploaded as artifacts.

Never make live voice calls without explicit approval. Do not invoke dispatch, digest, newsletters, Google Places discovery or other live writes as tests. Preserve both existing cron definitions, provider configuration, survey data and Supabase-backed limits. Public smoke checks use only static HTML; they do not call /api/dashboard because it writes a rate-limit row.

Release-provider refusal/rollback tests use mocks and no network/credentials. They do not claim database/RLS or live delivery verification. Keep existing dependency pins; separate dependency alerts and application limitations from migration evidence.
