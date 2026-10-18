#!/usr/bin/env bash
set -euo pipefail
test "$GITHUB_SERVER_URL" = 'http://192.168.1.130:3000'
test "$GITHUB_flatwhiteindexSITORY" = 'hallyaus/flatwhiteindex'
test "$GITHUB_REF" = 'refs/heads/master'
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
node --input-type=module -e 'if (process.versions.node.split(".")[0] !== "24") throw Error("Use Node 24");'
unset VERCEL_TOKEN VERCEL_OIDC_TOKEN DATABASE_URL DATABASE_TUNNEL_HOSTNAME DATABASE_TUNNEL_CLIENT_ID DATABASE_TUNNEL_CLIENT_SECRET CRON_SECRET SUPABASE_URL SUPABASE_SERVICE_KEY ELEVENLABS_API_KEY ELEVENLABS_AGENT_ID ELEVENLABS_PHONE_NUMBER_ID BLAND_API_KEY TWILIO_AUTH_TOKEN GOOGLE_PLACES_API_KEY RESEND_API_KEY STRIPE_SECRET_KEY
export NEXT_TELEMETRY_DISABLED=1
node --experimental-vm-modules .gitea/scripts/check-production-release.mjs
npm ci
npm test
