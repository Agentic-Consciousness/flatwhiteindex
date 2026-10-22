#!/usr/bin/env bash
# GitHub version of the checks. The real checks are unchanged from the Gitea script; only the Gitea server
# and repository pins are replaced, and the tests of the retired Gitea deploy scripts are left out
# (Vercel's own GitHub link now deploys, so those scripts are not used).
set -euo pipefail
test "${GITHUB_SERVER_URL:?}" = 'https://github.com'
case "${GITHUB_REPOSITORY:?}" in
  HallyAus/flatwhiteindex|Agentic-Consciousness/flatwhiteindex) ;;
  *) echo "Unexpected repository: $GITHUB_REPOSITORY" >&2; exit 1 ;;
esac
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
node --input-type=module -e 'if (process.versions.node.split(".")[0] !== "24") throw Error("Use Node 24");'
unset VERCEL_TOKEN VERCEL_OIDC_TOKEN DATABASE_URL DATABASE_TUNNEL_HOSTNAME DATABASE_TUNNEL_CLIENT_ID DATABASE_TUNNEL_CLIENT_SECRET CRON_SECRET SUPABASE_URL SUPABASE_SERVICE_KEY ELEVENLABS_API_KEY ELEVENLABS_AGENT_ID ELEVENLABS_PHONE_NUMBER_ID BLAND_API_KEY TWILIO_AUTH_TOKEN GOOGLE_PLACES_API_KEY RESEND_API_KEY STRIPE_SECRET_KEY
export NEXT_TELEMETRY_DISABLED=1
npm ci
npm test
