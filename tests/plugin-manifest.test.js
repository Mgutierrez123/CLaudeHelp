/**
 * Tests for plugin manifests (Claude-only):
 *   - .claude-plugin/plugin.json (Claude Code plugin)
 *   - .claude-plugin/marketplace.json (Claude marketplace discovery)
 *   - .mcp.json (MCP server config at plugin root)
 *
 * Enforces rules from:
 *   - .claude-plugin/PLUGIN_SCHEMA_NOTES.md (Claude Code validator rules)
 *
 * Run with: node tests/run-all.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const packageLockPath = path.join(repoRoot, 'package-lock.json');
const rootAgentsPath = path.join(repoRoot, 'AGENTS.md');
const trAgentsPath = path.join(repoRoot, 'docs', 'tr', 'AGENTS.md');
const zhCnAgentsPath = path.join(repoRoot, 'docs', 'zh-CN', 'AGENTS.md');
const ptBrReadmePath = path.join(repoRoot, 'docs', 'pt-BR', 'README.md');
const trReadmePath = path.join(repoRoot, 'docs', 'tr', 'README.md');
const rootZhCnReadmePath = path.join(repoRoot, 'README.zh-CN.md');
const agentYamlPath = path.join(repoRoot, 'agent.yaml');
const versionFilePath = path.join(repoRoot, 'VERSION');
const zhCnReadmePath = path.join(repoRoot, 'docs', 'zh-CN', 'README.md');
const selectiveInstallArchitecturePath = path.join(repoRoot, 'docs', 'SELECTIVE-INSTALL-ARCHITECTURE.md');
const semverPattern = '[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    failed++;
  }
}

function loadJsonObject(filePath, label) {
  assert.ok(fs.existsSync(filePath), `Expected ${label} to exist`);

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    assert.fail(`Expected ${label} to contain valid JSON: ${error.message}`);
  }

  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), `Expected ${label} to contain a JSON object`);

  return parsed;
}

function collectMarkdownFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    return rootPath.endsWith('.md') ? [rootPath] : [];
  }

  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const nextPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(nextPath));
    } else if (entry.isFile() && nextPath.endsWith('.md')) {
      files.push(nextPath);
    }
  }
  return files;
}

const rootPackage = loadJsonObject(packageJsonPath, 'package.json');
const packageLock = loadJsonObject(packageLockPath, 'package-lock.json');
const expectedVersion = rootPackage.version;

test('package.json has version field', () => {
  assert.ok(expectedVersion, 'Expected package.json version field');
});

test('package-lock.json root version matches package.json', () => {
  assert.strictEqual(packageLock.version, expectedVersion);
  assert.ok(packageLock.packages && packageLock.packages[''], 'Expected package-lock root package entry');
  assert.strictEqual(packageLock.packages[''].version, expectedVersion);
});

test('AGENTS.md version line matches package.json', () => {
  const agentsSource = fs.readFileSync(rootAgentsPath, 'utf8');
  const match = agentsSource.match(new RegExp(`^\\*\\*Version:\\*\\* (${semverPattern})$`, 'm'));
  assert.ok(match, 'Expected AGENTS.md to declare a top-level version line');
  assert.strictEqual(match[1], expectedVersion);
});

test('docs/tr/AGENTS.md version line matches package.json', () => {
  const agentsSource = fs.readFileSync(trAgentsPath, 'utf8');
  const match = agentsSource.match(new RegExp(`^\\*\\*Sürüm:\\*\\* (${semverPattern})$`, 'm'));
  assert.ok(match, 'Expected docs/tr/AGENTS.md to declare a top-level version line');
  assert.strictEqual(match[1], expectedVersion);
});

test('docs/zh-CN/AGENTS.md version line matches package.json', () => {
  const agentsSource = fs.readFileSync(zhCnAgentsPath, 'utf8');
  const match = agentsSource.match(new RegExp(`^\\*\\*版本:\\*\\* (${semverPattern})$`, 'm'));
  assert.ok(match, 'Expected docs/zh-CN/AGENTS.md to declare a top-level version line');
  assert.strictEqual(match[1], expectedVersion);
});

test('agent.yaml version matches package.json', () => {
  const agentYamlSource = fs.readFileSync(agentYamlPath, 'utf8');
  const match = agentYamlSource.match(new RegExp(`^version:\\s*(${semverPattern})$`, 'm'));
  assert.ok(match, 'Expected agent.yaml to declare a top-level version field');
  assert.strictEqual(match[1], expectedVersion);
});

test('agent.yaml uses canonical ECC identity', () => {
  const agentYamlSource = fs.readFileSync(agentYamlPath, 'utf8');
  assert.ok(/^name:\s*ecc$/m.test(agentYamlSource), 'Expected agent.yaml to use the ecc name');
});

test('VERSION file matches package.json', () => {
  const versionFile = fs.readFileSync(versionFilePath, 'utf8').trim();
  assert.ok(versionFile, 'Expected VERSION file to be non-empty');
  assert.strictEqual(versionFile, expectedVersion);
});

test('docs/SELECTIVE-INSTALL-ARCHITECTURE.md repoVersion example matches package.json', () => {
  const source = fs.readFileSync(selectiveInstallArchitecturePath, 'utf8');
  const match = source.match(new RegExp(`"repoVersion":\\s*"(${semverPattern})"`));
  assert.ok(match, 'Expected docs/SELECTIVE-INSTALL-ARCHITECTURE.md to declare a repoVersion example');
  assert.strictEqual(match[1], expectedVersion);
});

test('docs/pt-BR/README.md latest release heading matches package.json', () => {
  const source = fs.readFileSync(ptBrReadmePath, 'utf8');
  assert.ok(source.includes(`### v${expectedVersion} `), 'Expected docs/pt-BR/README.md to advertise the current release heading');
});

test('docs/tr/README.md latest release heading matches package.json', () => {
  const source = fs.readFileSync(trReadmePath, 'utf8');
  assert.ok(source.includes(`### v${expectedVersion} `), 'Expected docs/tr/README.md to advertise the current release heading');
});

test('README.zh-CN.md latest release heading matches package.json', () => {
  const source = fs.readFileSync(rootZhCnReadmePath, 'utf8');
  assert.ok(source.includes(`### v${expectedVersion} `), 'Expected README.zh-CN.md to advertise the current release heading');
});

test('docs/zh-CN/README.md latest release heading matches package.json', () => {
  const source = fs.readFileSync(zhCnReadmePath, 'utf8');
  assert.ok(source.includes(`### v${expectedVersion} `), 'Expected docs/zh-CN/README.md to advertise the current release heading');
});

// ── Claude plugin manifest ────────────────────────────────────────────────────
console.log('\n=== .claude-plugin/plugin.json ===\n');

const claudePluginPath = path.join(repoRoot, '.claude-plugin', 'plugin.json');
const claudeMarketplacePath = path.join(repoRoot, '.claude-plugin', 'marketplace.json');

test('claude plugin.json exists', () => {
  assert.ok(fs.existsSync(claudePluginPath), 'Expected .claude-plugin/plugin.json to exist');
});

const claudePlugin = loadJsonObject(claudePluginPath, '.claude-plugin/plugin.json');

test('claude plugin.json has version field', () => {
  assert.ok(claudePlugin.version, 'Expected version field');
});

test('claude plugin.json version matches package.json', () => {
  assert.strictEqual(claudePlugin.version, expectedVersion);
});

test('claude plugin.json uses short plugin slug', () => {
  assert.strictEqual(claudePlugin.name, 'ecc');
});

test('claude plugin.json does NOT have agents field (unsupported by Claude Code validator)', () => {
  assert.ok(!('agents' in claudePlugin), 'agents field must NOT be declared — Claude Code plugin validator rejects it');
});

test('claude plugin.json skills is an array', () => {
  assert.ok(Array.isArray(claudePlugin.skills), 'Expected skills to be an array');
});

test('claude plugin.json commands is an array', () => {
  assert.ok(Array.isArray(claudePlugin.commands), 'Expected commands to be an array');
});

test('claude plugin.json disables bundled MCP servers for provider tool-name compatibility', () => {
  const legacyPluginName = 'everything-claude-code';
  const reportedOverlongToolName = `mcp__plugin_${legacyPluginName}_github__create_pull_request_review`;

  assert.ok(reportedOverlongToolName.length > 64, 'Expected the reported GitHub MCP tool name to exceed strict provider limits without the MCP opt-out');
  assert.ok(Object.prototype.hasOwnProperty.call(claudePlugin, 'mcpServers'), 'Expected mcpServers to be explicitly declared so Claude Code does not auto-load root .mcp.json');
  assert.deepStrictEqual(claudePlugin.mcpServers, {}, 'Claude plugin installs must not auto-bundle root MCP servers; document/manual MCP install remains supported');
});

test('claude plugin.json does NOT have explicit hooks declaration', () => {
  assert.ok(!('hooks' in claudePlugin), 'hooks field must NOT be declared — Claude Code v2.1+ auto-loads hooks/hooks.json by convention');
});

console.log('\n=== .claude-plugin/marketplace.json ===\n');

test('claude marketplace.json exists', () => {
  assert.ok(fs.existsSync(claudeMarketplacePath), 'Expected .claude-plugin/marketplace.json to exist');
});

const claudeMarketplace = loadJsonObject(claudeMarketplacePath, '.claude-plugin/marketplace.json');

test('claude marketplace.json keeps only Claude-supported top-level keys', () => {
  const unsupportedTopLevelKeys = ['$schema', 'description'];
  for (const key of unsupportedTopLevelKeys) {
    assert.ok(!(key in claudeMarketplace), `.claude-plugin/marketplace.json must not declare unsupported top-level key "${key}"`);
  }
});

test('claude marketplace.json has plugins array with the published plugin entry', () => {
  assert.ok(Array.isArray(claudeMarketplace.plugins) && claudeMarketplace.plugins.length > 0, 'Expected plugins array');
  assert.strictEqual(claudeMarketplace.name, 'ecc');
  assert.strictEqual(claudeMarketplace.plugins[0].name, 'ecc');
});

test('claude marketplace.json plugin version matches package.json', () => {
  assert.strictEqual(claudeMarketplace.plugins[0].version, expectedVersion);
});

// ── .mcp.json at plugin root ──────────────────────────────────────────────────
console.log('\n=== .mcp.json (plugin root) ===\n');

const mcpJsonPath = path.join(repoRoot, '.mcp.json');

test('.mcp.json exists at plugin root', () => {
  assert.ok(fs.existsSync(mcpJsonPath), 'Expected .mcp.json at repo root (plugin root)');
});

const mcpConfig = loadJsonObject(mcpJsonPath, '.mcp.json');

test('.mcp.json has mcpServers object', () => {
  assert.ok(mcpConfig.mcpServers && typeof mcpConfig.mcpServers === 'object', 'Expected mcpServers object');
});

test('.mcp.json default set follows the connector policy', () => {
  const servers = Object.keys(mcpConfig.mcpServers);
  assert.ok(servers.includes('chrome-devtools'), 'Expected chrome-devtools as the default browser connector');
  assert.ok(servers.length <= 2, `Default connector set must stay minimal per docs/MCP-CONNECTOR-POLICY.md (found ${servers.length})`);
});

test('.mcp.json does not reintroduce retired default connectors', () => {
  const retired = ['github', 'context7', 'exa', 'memory', 'playwright', 'sequential-thinking'];
  const servers = Object.keys(mcpConfig.mcpServers);
  for (const name of retired) {
    assert.ok(!servers.includes(name), `${name} was retired from the default set (June 2026 audit) — it lives in mcp-configs/mcp-servers.json as opt-in; see docs/MCP-CONNECTOR-POLICY.md`);
  }
});

test('README version row matches package.json', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const match = readme.match(new RegExp(`^\\| \\*\\*Version\\*\\* \\| Plugin \\| Plugin \\| Reference config \\| (${semverPattern}) \\|(?: Instruction layer \\|)?$`, 'm'));
  assert.ok(match, 'Expected README version summary row');
  assert.strictEqual(match[1], expectedVersion);
});

test('user-facing docs do not use overlong legacy marketplace install commands', () => {
  const markdownFiles = [
    path.join(repoRoot, 'README.md'),
    path.join(repoRoot, 'README.zh-CN.md'),
    path.join(repoRoot, 'skills', 'configure-ecc', 'SKILL.md'),
    ...collectMarkdownFiles(path.join(repoRoot, 'docs'))
  ].filter(filePath => !path.relative(repoRoot, filePath).startsWith(`docs${path.sep}drafts${path.sep}`));

  const offenders = [];
  for (const filePath of markdownFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    if (/\/plugin\s+(install|list)\s+everything-claude-code(?:@everything-claude-code)?\b/.test(source)) {
      offenders.push(path.relative(repoRoot, filePath));
    }
  }

  assert.deepStrictEqual(offenders, [], `Overlong legacy install commands must not appear in user-facing docs: ${offenders.join(', ')}`);
});

test('user-facing docs do not use the legacy non-URL marketplace add form', () => {
  const markdownFiles = [path.join(repoRoot, 'README.md'), path.join(repoRoot, 'README.zh-CN.md'), ...collectMarkdownFiles(path.join(repoRoot, 'docs'))];

  const offenders = [];
  for (const filePath of markdownFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    if (source.includes('/plugin marketplace add affaan-m/everything-claude-code')) {
      offenders.push(path.relative(repoRoot, filePath));
    }
  }

  assert.deepStrictEqual(offenders, [], `Legacy non-URL marketplace add form must not appear in user-facing docs: ${offenders.join(', ')}`);
});

test('docs/zh-CN/README.md version row matches package.json', () => {
  const readme = fs.readFileSync(zhCnReadmePath, 'utf8');
  const match = readme.match(new RegExp(`^\\| \\*\\*版本\\*\\* \\| 插件 \\| 插件 \\| 参考配置 \\| (${semverPattern}) \\|$`, 'm'));
  assert.ok(match, 'Expected docs/zh-CN/README.md version summary row');
  assert.strictEqual(match[1], expectedVersion);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
