## GitHub source control and self-hosted runner (current policy, 2026-10-22)

- **Canonical repository:** `https://github.com/HallyAus/flatwhiteindex`. GitHub is the source of truth. Commit, push, open pull requests and publish tags/releases to GitHub; do not publish to former Git servers or maintain a secondary recovery mirror.
- **Branch and remote:** Use the repository's current GitHub default/production branch, verify `git remote -v` before pushing, preserve uncommitted work and never force-push over newer commits.
- **CI/CD:** A self-hosted GitHub Actions runner is available. Prefer it for eligible jobs when the repository has a configured workflow; use the exact runner labels verified in repository settings or existing workflows. Do not assume the runner's OS, permissions, online status or available secrets, and do not expose credentials to untrusted contributions.
- **Validation and deployment:** Keep the project's existing tests, security checks, branch protections, release approvals, staging/acceptance and production verification. A GitHub push or green build is not proof of production deployment. Do not silently enable or bypass deployment triggers, and never infer that Vercel, Proxmox or another target deploys automatically.
- **Precedence:** This section overrides older hosting, mirror, disabled-Actions and publishing instructions elsewhere in this file. Preserve non-hosting project-specific safety rules.

# Flat White Index source and production

Existing personal Vercel project prj_Y3gIgq8bSrJ60hjhxDJs28yw63gP (flatwhiteindex), team_xyQ79UW6Bz7wt6O8KsL2NuRO, Node.js 22.x, syd1. The personal-ubuntu release runner still executes the CLI on Node 24. Use VM301 personal-ubuntu capacity one and this repository's VERCEL_TOKEN only. No user/org/instance secrets.

Manual runner364 passed exact-source checks, existing Production prebuild, protected static-page acceptance, same-ID promotion and public/alias/error checks. Both existing dispatch schedules followed the accepted production deployment; no call/cron was invoked as a test. Git is disconnected and identical recovery is verified inert. master pushes now use this route; prove the first actual push before claiming automatic deployment. Refuse a restored Git link, keep schedules on old production until promotion and verify them on the promoted ID. Generated settings/output are cleaned and never uploaded as artifacts.

Never make live voice calls without explicit approval. Do not invoke dispatch, digest, newsletters, Google Places discovery or other live writes as tests. Preserve both existing cron definitions, provider configuration, survey data and Supabase-backed limits. Public smoke checks use only static HTML; they do not call /api/dashboard because it writes a rate-limit row.

Release-provider refusal/rollback tests use mocks and no network/credentials. They do not claim database/RLS or live delivery verification. Keep existing dependency pins; separate dependency alerts and application limitations from migration evidence.
