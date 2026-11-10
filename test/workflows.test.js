import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Events a person without write access can fire on a public repository.
// pull_request is the one that also executes the workflow from the fork.
const OUTSIDER_EVENTS = new Set([
  "discussion",
  "discussion_comment",
  "issue_comment",
  "issues",
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
  "pull_request_target",
  "workflow_run",
]);

const WORKFLOW_DIRS = [".github/workflows", ".gitea/workflows"];

function stripComment(line) {
  return line.replace(/\s+#.*$/, "");
}

function unquote(token) {
  return token.replace(/^['"]|['"]$/g, "");
}

function parseBlock(lines, startIndex) {
  const first = stripComment(lines[startIndex]);
  const indent = first.match(/^(\s*)/)[1].length;
  const rest = first.slice(first.indexOf(":") + 1).trim();
  const collected = [];
  if (rest && rest !== "|" && rest !== ">") collected.push(rest);
  for (let i = startIndex + 1; i < lines.length; i++) {
    const raw = stripComment(lines[i]);
    if (raw.trim() === "") continue;
    const lineIndent = raw.match(/^(\s*)/)[1].length;
    if (lineIndent <= indent) break;
    collected.push(raw.trim());
  }
  return collected.join(" ");
}

function eventNames(spec) {
  const names = new Set();
  const bracket = spec.match(/^\[([^\]]+)\]/);
  if (bracket) {
    for (const item of bracket[1].split(",")) names.add(unquote(item.trim()));
  }
  const bare = spec.match(/^([A-Za-z0-9_]+)$/);
  if (bare) names.add(bare[1]);
  for (const match of spec.matchAll(/(?:^|[\s[{,])([A-Za-z0-9_]+)\s*:/g)) {
    names.add(match[1]);
  }
  return [...names];
}

function triggerEvents(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^on:/.test(stripComment(line)));
  assert.notEqual(start, -1, "workflow is missing an on: block");
  return eventNames(parseBlock(lines, start));
}

function runsOnSpecs(text) {
  const lines = text.split(/\r?\n/);
  const specs = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*runs-on:/.test(stripComment(lines[i]))) specs.push(parseBlock(lines, i));
  }
  return specs;
}

function runsOnLabels(spec) {
  const bracket = spec.match(/\[([^\]]*)\]/);
  if (bracket) {
    return bracket[1].split(",").map((item) => unquote(item.trim())).filter(Boolean);
  }
  const dashed = [...spec.matchAll(/-\s+([^\s,]+)/g)].map((match) => unquote(match[1]));
  if (dashed.length > 0) return dashed;
  const token = spec.trim().split(/\s+/)[0];
  return token ? [unquote(token)] : [];
}

function isGitHubHosted(label) {
  return /^(ubuntu|windows|macos)-[A-Za-z0-9.]+$/.test(label);
}

function workflowViolations(text) {
  const outsider = triggerEvents(text).filter((event) => OUTSIDER_EVENTS.has(event));
  if (outsider.length === 0) return [];
  const violations = [];
  for (const spec of runsOnSpecs(text)) {
    if (spec.includes("${{") || !runsOnLabels(spec).every(isGitHubHosted)) {
      violations.push(`${outsider.join(", ")} -> ${spec}`);
    }
  }
  return violations;
}

function workflowFiles() {
  const files = [];
  for (const dir of WORKFLOW_DIRS) {
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".yml") || name.endsWith(".yaml")) files.push(join(dir, name));
    }
  }
  return files;
}

describe("workflow runner policy", () => {
  it("reads pull_request triggers and hosted runners", () => {
    const text = "on:\n  pull_request:\n    branches: [master]\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
    assert.deepEqual(workflowViolations(text), []);
  });

  it("rejects a self-hosted runner on an outsider-triggered workflow", () => {
    const text = "on:\n  pull_request:\njobs:\n  test:\n    runs-on: [personal-official]\n";
    assert.deepEqual(workflowViolations(text), ["pull_request -> [personal-official]"]);
  });

  it("allows a self-hosted runner when only maintainers can trigger the workflow", () => {
    const text = "on:\n  push:\n    branches: [master]\n  workflow_dispatch:\njobs:\n  test:\n    runs-on: [personal-official]\n";
    assert.deepEqual(workflowViolations(text), []);
  });

  it("rejects a dynamic runs-on that can still select a self-hosted runner", () => {
    const text = "on:\n  issue_comment:\njobs:\n  test:\n    runs-on: ${{ 'personal-official' }}\n";
    assert.equal(workflowViolations(text).length, 1);
  });

  it("keeps this repository's outsider-triggered workflows on GitHub-hosted runners", () => {
    const failures = [];
    for (const file of workflowFiles()) {
      const violations = workflowViolations(readFileSync(file, "utf8"));
      for (const violation of violations) failures.push(`${file}: ${violation}`);
    }
    assert.deepEqual(failures, []);
  });
});
