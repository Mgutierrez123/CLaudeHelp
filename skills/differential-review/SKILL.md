---
name: differential-review
description: Use when reviewing a specific set of changes (a PR diff or a branch) through a security lens rather than a general code-quality lens — reason about what the change adds to the attack surface, whether it introduces tainted-input paths, and whether it weakens an existing control. TRIGGER when reviewing a PR/branch for security, or gating a change before merge. DO NOT TRIGGER for whole-repo scanning (use static-analysis) or dependency risk (use supply-chain-risk-auditor).
metadata:
  origin: ECC
tools: Read, Grep, Glob, Bash
---

# Differential Security Review

Review a specific change — a PR diff or a branch — for what it does to the
security posture, not just whether the code is clean. The unit of analysis is the
**delta**: what attack surface did this add, what input paths did it open, and did
it silently weaken a control that already existed?

> Methodology inspired by the [Trail of Bits skills](https://github.com/trailofbits/skills)
> differential-review and audit-context-building workflows (CC-BY-SA-4.0). This
> skill is original ECC text; no upstream prose is reproduced.

## When to Use

- Security review of a pull request before merge
- Auditing a branch that touches auth, input handling, crypto, or permissions
- A pre-merge gate for changes to sensitive subsystems

For whole-codebase scanning use `static-analysis`; for dependency changes use
`supply-chain-risk-auditor`.

## Get the Diff

```bash
git diff $(git merge-base main HEAD)..HEAD        # branch vs base
git diff main...feature-branch                    # PR-style three-dot diff
```

Read the **whole** diff first for context before judging any single hunk. A hunk
that looks safe in isolation can be unsafe given what another hunk changed.

## What to Look For in a Delta

| The change… | Ask |
|-------------|-----|
| adds an input/parameter/route/field | Is it validated? Where does it flow? |
| touches auth / session / permission checks | Did it weaken or bypass a check? |
| adds a sink (exec, query, file path, deserialization, template) | Can attacker input reach it? |
| changes crypto / secrets / token handling | Constant-time? Secret logged or leaked? |
| removes or loosens a check | Was that check load-bearing? Why removed? |
| adds error handling / logging | Does it swallow errors or log secrets? |
| widens scope (new dependency, new capability, new file write) | Is the new capability necessary and bounded? |

## How It Works

### 1. Build context for the changed area

Before reading the diff line-by-line, understand the subsystem it touches: what
are the trust boundaries here, what is attacker-controlled, what invariant is this
code supposed to hold? The diff only tells you what changed — you supply what it
is *supposed* to protect.

### 2. Trace new input to sinks

For every new source of input the change introduces (request field, CLI arg, file,
message), follow where it flows. If it reaches a dangerous sink — `exec`, SQL,
path join, deserialization, a template, a redirect — without validation or
encoding, that is a finding.

### 3. Check for weakened controls

Look specifically at **removed** and **loosened** lines, not just additions. A
diff that deletes a bounds check, broadens a permission, drops a `persist-
credentials: false`, or replaces a strict comparison with a loose one is a common
way regressions slip in. If a control was removed, the PR must justify why.

### 4. Watch the "cannot verify from diff" gap

Some requirements live in code the diff does not touch (a caller that must
validate before invoking the changed function, an invariant enforced elsewhere).
Note these explicitly and verify them yourself — the diff alone cannot confirm
them, and that is exactly where security bugs hide.

### 5. Run scoped tooling on the diff

Complement the manual read with targeted tools scoped to changed files:

```bash
semgrep --config p/security-audit $(git diff --name-only main...HEAD)
```

Use tooling to catch the mechanical patterns; use your reasoning for the logic and
trust-boundary bugs tools cannot see.

### 6. Report findings, ranked

For each finding: the file/line, the concrete failure scenario (what input →
what bad outcome), severity, and the fix. Separate **Critical/Important**
(block the merge) from **Minor** (note but do not block). Do not pad the report
with style nits — this is a security review, not a lint pass.

## Verdict Discipline

- **Block** on any reachable Critical/High issue introduced or unblocked by the change.
- **Request changes** on a weakened control with no justification.
- **Approve with notes** when only Minor items remain, and log them.
- Never approve a security-sensitive change you could not fully reason about —
  say what you could not verify and ask.

## Anti-Patterns

- Reviewing hunks in isolation and missing a cross-hunk interaction.
- Only reading additions and ignoring removed/loosened lines.
- Treating green tests as a security pass — tests rarely encode the attacker's goals.
- Letting the security review dissolve into a style review.

## Related

- `static-analysis` — whole-codebase scanning and custom rules
- `supply-chain-risk-auditor` — dependency-level review
- `security-review` — ECC's general security review skill
- `receiving-code-review` / `requesting-code-review` patterns from `subagent-driven-development`
