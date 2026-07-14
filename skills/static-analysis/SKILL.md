---
name: static-analysis
description: Use when you want to find security bugs across a codebase with automated tools rather than manual reading — run Semgrep and/or CodeQL, normalize results to SARIF, triage findings by severity and confidence, and write targeted custom rules for project-specific patterns. TRIGGER when auditing a repo for vulnerabilities, wiring SAST into CI, or hunting variants of a known bug. DO NOT TRIGGER for dependency/supply-chain risk (use supply-chain-risk-auditor) or single-diff review (use differential-review).
metadata:
  origin: ECC
tools: Read, Grep, Glob, Bash
---

# Static Analysis (Semgrep + CodeQL + SARIF)

Drive automated static analysis to find security bugs at scale: run the scanners,
normalize their output to SARIF, triage the findings, and write custom rules for
patterns specific to your codebase.

> Methodology inspired by the [Trail of Bits skills](https://github.com/trailofbits/skills)
> static-analysis, semgrep-rule-creator, and variant-analysis workflows
> (CC-BY-SA-4.0). This skill is original ECC text; no upstream prose is reproduced.

## When to Use

- Auditing a repository for vulnerabilities before a release or handoff
- Wiring SAST into CI so regressions are caught on every PR
- Hunting for **variants** of a bug you already found (same sink, other call sites)
- Encoding a project-specific dangerous pattern as a reusable rule

Do not use this for dependency vulnerabilities (`supply-chain-risk-auditor`) or a
focused review of one change (`differential-review`).

## Tool Selection

| Tool | Strength | Use when |
|------|----------|----------|
| **Semgrep** | Fast, pattern-based, easy custom rules, many languages | First pass, custom project rules, CI gate |
| **CodeQL** | Deep dataflow/taint tracking, semantic queries | Injection/taint bugs, precise variant analysis |
| **SARIF** | Common result format both emit | Merging, deduping, and rendering results uniformly |

Start with Semgrep for breadth and speed; reach for CodeQL when you need to prove
a tainted source reaches a dangerous sink through the actual dataflow.

## How It Works

### 1. Run Semgrep

```bash
# Curated security rulesets
semgrep --config p/security-audit --config p/secrets --sarif -o semgrep.sarif .

# Language packs (examples)
semgrep --config p/javascript --config p/python --sarif -o semgrep.sarif .
```

### 2. Run CodeQL (for dataflow-heavy targets)

```bash
codeql database create db --language=javascript   # or python, java, cpp, go...
codeql database analyze db --format=sarifv2.1.0 -o codeql.sarif \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls
```

### 3. Normalize and merge to SARIF

Both tools emit SARIF, so treat it as the common currency: merge `semgrep.sarif`
and `codeql.sarif`, dedupe by rule + file + line, and render one ranked list.
SARIF also uploads cleanly to GitHub code scanning if you want findings inline on
PRs.

### 4. Triage by severity AND confidence

Do not treat every hit as a bug. For each finding, decide:

- **Severity** — what is the impact if it is real? (RCE/injection > info leak > hygiene)
- **Confidence** — does the flagged code actually reach an attacker-controlled
  source and a real sink, or is it a pattern match on safe code?

Rank Critical/High + high-confidence first. Route low-confidence pattern matches
to a `false-positive` triage bucket rather than the fix list. When a finding is
genuinely not exploitable, suppress it **narrowly** (rule + location) with a
one-line reason, never a blanket disable.

### 5. Write custom rules for project-specific patterns

When you find a dangerous pattern the stock rules miss, encode it so it never
regresses. A Semgrep rule needs a `pattern`, a `message`, a `severity`, and the
`languages`:

```yaml
rules:
  - id: no-raw-child-process-from-request
    languages: [javascript, typescript]
    severity: ERROR
    message: >
      User-controlled input flows into child_process without validation.
      Use an allowlist or a safe exec wrapper.
    pattern: child_process.exec($REQ.$X, ...)
```

Test the rule against known-bad and known-good samples before adding it to CI.

### 6. Variant analysis

Once you confirm one real bug, search for its siblings: take the vulnerable sink
(or the fixed pattern) and query the whole codebase for other call sites with the
same shape. One confirmed injection usually has cousins; fixing only the reported
line leaves the variants live.

## CI Integration

- Gate PRs on the custom high-confidence ruleset (fail on new ERROR findings).
- Upload SARIF to code scanning so findings annotate the diff.
- Keep the noisy exploratory rulesets out of the blocking gate — run them
  scheduled, not per-PR, so the gate stays actionable.

## Anti-Patterns

- Dumping every scanner hit into the report without triage — burns trust and
  hides the real bugs.
- Blanket-suppressing a whole rule to clear noise — you lose the true positives too.
- Fixing the one reported line and skipping variant analysis.
- Running CodeQL on everything — it is slow; scope it to the taint-sensitive
  languages/areas that need dataflow.

## Related

- `differential-review` — apply this thinking to a single PR diff
- `supply-chain-risk-auditor` — dependency-level risk, not code-level
- `security-review`, `security-scan` — ECC's broader security workflows
