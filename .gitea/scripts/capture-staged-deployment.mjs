import assert from 'node:assert/strict';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function parseStagedDeployment(text) {
  const result = JSON.parse(text);
  assert.equal(result.status, 'ok');
  const deployment = result.deployment;
  assert.match(deployment.id, /^dpl_[A-Za-z0-9]+$/);
  assert.equal(deployment.readyState, 'READY');
  assert.equal(deployment.target, 'production');
  const url = new URL(deployment.url);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.origin, deployment.url);
  assert.ok(url.hostname.startsWith('flatwhiteindex-') && url.hostname.endsWith('.vercel.app'));
  return { id: deployment.id, url: url.origin };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.env.GITHUB_SERVER_URL, 'http://192.168.1.130:3000');
  assert.equal(process.env.GITHUB_REPOSITORY, 'hallyaus/flatwhiteindex');
  assert.ok(process.env.GITHUB_OUTPUT);
  const deployment = parseStagedDeployment(readFileSync(0, 'utf8'));
  appendFileSync(process.env.GITHUB_OUTPUT, `url=${deployment.url}\nid=${deployment.id}\n`);
  console.log(`Staged deployment: ${deployment.url}; ${deployment.id}`);
}
