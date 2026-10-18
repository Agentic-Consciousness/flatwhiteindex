import assert from 'node:assert/strict';
import { existsSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';

assert.equal(process.platform, 'linux');
assert.equal(process.env.GITHUB_SERVER_URL, 'http://192.168.1.130:3000');
assert.equal(process.env.GITHUB_REPOSITORY, 'hallyaus/flatwhiteindex');
assert.equal(realpathSync(process.cwd()), realpathSync(process.env.GITHUB_WORKSPACE));
const generatedDirectory = join(process.cwd(), '.vercel');
if (existsSync(generatedDirectory)) rmSync(generatedDirectory, { recursive: true, force: true });
