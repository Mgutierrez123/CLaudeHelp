'use strict';

const { normalizeServerEntry, buildInventory } = require('./canonical-mcp');
const { readClaudeCodeMcp } = require('./readers/claude-code');

const DEFAULT_READERS = Object.freeze({
  'claude-code': readClaudeCodeMcp
});

// Collect MCP server configs (from Claude Code's user- and project-scope
// config files), normalize each raw entry to ecc.mcp.v1, then merge into a
// single deduplicated inventory with a fragmentation report. Secrets are
// stripped during normalization (only env key names survive), so the
// returned inventory is safe to print or persist.
function collectMcpInventory(options = {}) {
  const readers = options.readers || DEFAULT_READERS;
  const readerOptions = options.readerOptions || {};

  const rawRecords = [];
  for (const [harness, reader] of Object.entries(readers)) {
    if (typeof reader !== 'function') {
      continue;
    }

    let entries;
    try {
      entries = reader(readerOptions[harness] || readerOptions.shared || {});
    } catch {
      entries = [];
    }

    if (Array.isArray(entries)) {
      rawRecords.push(...entries);
    }
  }

  const normalized = rawRecords.map(normalizeServerEntry);
  return buildInventory(normalized);
}

module.exports = {
  collectMcpInventory,
  DEFAULT_READERS
};
