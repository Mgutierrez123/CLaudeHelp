#!/usr/bin/env node
/**
 * Validate safety guardrails on agent-facing instruction artifacts.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

const guardrails = [
  {
    path: 'skills/autonomous-agent-harness/SKILL.md',
    heading: '## Consent and Safety Boundaries',
    requiredPatterns: [
      /explicitly requested and scoped/i,
      /Do not create schedules/i,
      /Prefer dry-run plans/i,
    ],
  },
  {
    path: 'skills-nicho/defi-amm-security/SKILL.md',
    heading: '## Execution Safety',
    requiredPatterns: [
      /local audit examples/i,
      /trusted checkout or disposable sandbox/i,
      /private keys, seed phrases/i,
    ],
  },
];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function run() {
  console.log('\n=== Testing agent instruction safety guardrails ===\n');

  let passed = 0;
  let failed = 0;

  for (const guardrail of guardrails) {
    if (test(`${guardrail.path} keeps scoped safety guardrails`, () => {
      const source = read(guardrail.path);
      assert.ok(source.includes(guardrail.heading), `${guardrail.path} missing ${guardrail.heading}`);
      for (const pattern of guardrail.requiredPatterns) {
        assert.ok(pattern.test(source), `${guardrail.path} missing ${pattern}`);
      }
    })) passed++; else failed++;
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
