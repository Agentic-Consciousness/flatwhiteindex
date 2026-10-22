import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const team = 'team_xyQ79UW6Bz7wt6O8KsL2NuRO';
const project = 'prj_Y3gIgq8bSrJ60hjhxDJs28yw63gP';
const repo = 'hallyaus/flatwhiteindex';
assert.equal(process.env.GITHUB_SERVER_URL, 'http://192.168.1.130:3000');
assert.equal(process.env.GITHUB_REPOSITORY, repo);
assert.equal(process.env.GITHUB_REF, 'refs/heads/master');
assert.equal(process.env.VERCEL_ORG_ID, team);
assert.equal(process.env.VERCEL_PROJECT_ID, project);
assert.ok(process.env.VERCEL_TOKEN, 'Repository deployment credential is required');
const sha = process.env.GITHUB_SHA;
assert.match(sha ?? '', /^[0-9a-f]{40}$/);
const url = new URL(process.env.DEPLOYMENT_URL);
assert.equal(url.protocol, 'https:');
assert.equal(url.origin, process.env.DEPLOYMENT_URL);
assert.ok(url.hostname.startsWith('flatwhiteindex-') && url.hostname.endsWith('.vercel.app'));
const routes = Object.freeze([{"path": "/", "markers": ["Flat White Index", "Sydney"]}, {"path": "/sydney-coffee-price-report-2026", "markers": ["Flat White Index", "A city, measured"]}, {"path": "/press.html", "markers": ["Flat White Index", "One question.", "methodology"]}]);
function cli(args, timeout = 90000) {
  const result = spawnSync('vercel', args, {
    encoding: 'utf8', timeout, maxBuffer: 6 * 1024 * 1024,
    env: { ...process.env, VERCEL_TELEMETRY_DISABLED: '1' },
  });
  // Never relay captured CLI diagnostics or provider bodies: they may contain secrets.
  if (result.error || result.status !== 0) throw new Error(`Vercel ${args[0]} operation failed; inspect the bounded provider status`);
  return result.stdout;
}
const api = path => JSON.parse(cli(['api', `${path}${path.includes('?') ? '&' : '?'}teamId=${team}`, '--raw', '--scope', team, '--non-interactive']));
function checkContent(body, markers, path) {
  const text = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  for (const marker of markers) assert.ok(text.includes(marker.toLowerCase()), `Missing expected public content on ${path}`);
}
function checkedProject() {
  const p = api(`/v9/projects/${project}`);
  assert.equal(p.id, project);
  assert.equal(p.name, 'flatwhiteindex');
  assert.equal(p.accountId, team);
  assert.equal(p.nodeVersion, '22.x');
  assert.equal(p.link ?? null, null, 'GitHub recovery must not retain a deployment trigger');
  assert.equal(p.crons?.disabledAt, null, 'Preserve enabled production schedules');
  assert.deepEqual(p.crons?.definitions.map(({path,schedule})=>({path,schedule})), [{"path": "/api/cron/dispatch", "schedule": "*/15 23 * * 1-5"}, {"path": "/api/cron/dispatch", "schedule": "*/15 0-5 * * 1-5"}], 'Preserve existing scheduled production routes');
  return p;
}
const deployment = api(`/v13/deployments/${url.hostname}`);
const id = deployment.id;
assert.match(id ?? '', /^dpl_[A-Za-z0-9]+$/);
assert.equal(deployment.readyState, 'READY');
assert.equal(deployment.target, 'production');
assert.equal(deployment.projectId, project);
assert.equal(deployment.ownerId, team);
assert.equal(deployment.meta.giteaCommitSha, sha);
assert.equal(deployment.meta.giteaRepository, repo);
assert.equal(deployment.meta.source, 'vm300-gitea');
assert.equal(deployment.url, url.hostname);
assert.ok(deployment.regions.includes('syd1'), 'Preserve the existing Sydney runtime');
const previous = checkedProject().targets.production.id;
assert.match(previous, /^dpl_[A-Za-z0-9]+$/);
assert.notEqual(previous, id);
console.log(`Exact Gitea source verified: ${sha}; staged ${id}; rollback ${previous}`);
assert.equal(checkedProject().crons.deploymentId, previous, 'Scheduled calls must stay on accepted production until promotion');

async function requireCurrentSource() {
  assert.ok(process.env.SOURCE_TOKEN, 'Repository job token is required for the release source guard');
  const response = await fetch(`http://192.168.1.130:3000/api/v1/repos/${repo}/branches/master`, {
    headers: { Authorization: `token ${process.env.SOURCE_TOKEN}` },
    redirect: 'error', signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, 'Unable to verify the current protected Gitea branch');
  const branch = await response.json();
  assert.equal(branch.name, 'master');
  assert.equal(branch.commit.id, sha, 'A newer Gitea commit superseded this release; keep the current production deployment');
}
await requireCurrentSource();

// Only three static public routes; no forms, auth, billing, email or database writes.
// The supported CLI handles protected-stage access without exposing its bypass value.
for (const route of routes) {
  // CLI 54.18.0 forwards global flags to native curl. Use the already verified
  // .vercel project link and repository credential, with only curl's own flags.
  const body = cli(['curl', route.path, '--deployment', url.origin, '--yes', '--', '--fail', '--silent', '--show-error', '--max-time', '30']);
  checkContent(body, route.markers, route.path);
  console.log(`Staged read-only acceptance passed: ${route.path}`);
}
assert.equal(checkedProject().targets.production.id, previous, 'Production changed during staged acceptance');
await requireCurrentSource();
try {
  cli(['promote', id, '--yes', '--scope', team, '--non-interactive']);
  const aliases = api(`/v4/aliases?projectId=${project}&limit=100`).aliases;
  for (const name of ["flatwhiteindex.com.au", "www.flatwhiteindex.com.au", "flatwhiteindex-delta.vercel.app", "flatwhiteindex-danieljhall-mecoms-projects.vercel.app"]) {
    const match = aliases.filter(alias => alias.alias === name);
    assert.equal(match.length, 1);
    assert.equal(match[0].deploymentId, id, 'Production alias did not move to the tested deployment');
  }
  for (const route of routes) {
    const response = await fetch(`https://www.flatwhiteindex.com.au${route.path}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, `Public route failed: ${route.path}`);
    checkContent(await response.text(), route.markers, route.path);
    console.log(`Public read-only acceptance passed: ${route.path}`);
  }
  assert.equal(checkedProject().crons.deploymentId, id, 'Existing schedules must follow the promoted deployment');
  const logs = cli(['logs', '--deployment', id, '--environment', 'production', '--since', '10m', '--level', 'error', '--limit', '20', '--no-branch', '--json', '--scope', team, '--non-interactive']);
  const records = logs.split('\n').filter(line => /^\s*\{/.test(line));
  assert.equal(records.length, 0, 'New deployment returned runtime error records');
  console.log(`Production release verified: ${id}; source ${sha}; rollback retained ${previous}`);
} catch (error) {
  const current = checkedProject().targets.production.id;
  if (current === id) {
    cli(['promote', previous, '--yes', '--scope', team, '--non-interactive']);
    assert.equal(checkedProject().targets.production.id, previous);
    console.log(`Deployment acceptance failed; restored immutable rollback ${previous}`);
  }
  throw error;
}
