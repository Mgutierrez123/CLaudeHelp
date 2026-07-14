---
name: supply-chain-risk-auditor
description: Use when adding, updating, or auditing third-party dependencies — assess each package for known vulnerabilities, install-time script risk, maintainer/typosquat red flags, and license compatibility before it enters the build. TRIGGER when reviewing a package.json/lockfile change, a new dependency PR, or a periodic dependency hygiene pass. DO NOT TRIGGER for first-party code review (use differential-review) or runtime config audits (use security-scan).
metadata:
  origin: ECC
tools: Read, Grep, Glob, Bash
---

# Supply-Chain Risk Auditor

Evaluate third-party dependencies for known vulnerabilities, malicious-package
patterns, and license risk before they land in the build. Complements ECC's
existing IOC scanner (`npm run security:ioc-scan`,
`scripts/ci/scan-supply-chain-iocs.js`) by focusing on the *dependency-selection*
decision rather than post-install indicators.

> Methodology inspired by the [Trail of Bits skills](https://github.com/trailofbits/skills)
> supply-chain and audit workflows (CC-BY-SA-4.0). This skill is original ECC
> text; no upstream prose is reproduced.

## When to Use

- A PR adds or bumps dependencies (`package.json`, `package-lock.json`,
  `pnpm-lock.yaml`, `requirements.txt`, `Cargo.toml`, `go.mod`, etc.)
- Onboarding an unfamiliar repo — inventory what you are trusting
- A periodic dependency hygiene / renovate sweep
- After a public supply-chain incident, to check exposure

## What to Check

| Dimension | What you are looking for | How to check |
|-----------|--------------------------|--------------|
| Known CVEs | Advisories against the exact version | `npm audit`, `osv-scanner`, `pip-audit`, `cargo audit` |
| Install scripts | `preinstall`/`postinstall` running code at install time | grep the package's `scripts`; prefer `--ignore-scripts` installs |
| Typosquat / confusion | Names one edit away from a popular package; scoped vs unscoped swaps | compare against the intended package; check download counts |
| Maintainer signal | Brand-new package, sudden maintainer change, unpublished→republished | registry metadata, publish history |
| Transitive blast radius | A tiny direct dep pulling a large/risky tree | `npm ls`, lockfile diff |
| License | Copyleft/incompatible license entering an MIT/proprietary project | package `license` field vs project policy |
| Integrity | Lockfile hash mismatch, missing `integrity` field | inspect the lockfile diff |

## How It Works

### 1. Scope the change

Diff the manifest and lockfile. List exactly which packages are **new**, which
are **bumped** (old→new version), and which transitive deps changed. Audit only
what changed unless doing a full sweep.

### 2. Run the ecosystem auditors

```bash
# Node
npm audit --audit-level=moderate
npm audit signatures          # registry signature verification

# Cross-ecosystem (if available)
osv-scanner --lockfile=package-lock.json

# Python / Rust
pip-audit
cargo audit
```

Record each advisory with its severity, the affected version range, and whether a
fixed version exists.

### 3. Inspect install-time behavior

For each new/bumped package, check whether it runs code at install:

```bash
npm view <pkg>@<version> scripts
```

Any `preinstall`/`install`/`postinstall` is a risk surface. Prefer installing
with lifecycle scripts disabled (`npm ci --ignore-scripts`) and enabling them
only for packages that genuinely need a native build — matching ECC's own
workflow-security rule.

### 4. Screen for malicious-package patterns

- **Typosquatting:** is the name a near-miss of a well-known package? Did a
  scoped package quietly become unscoped (or vice versa)?
- **Fresh/low-trust:** first publish within days, near-zero downloads, no repo
  link, or a repo that does not match the published tarball.
- **Republish anomalies:** a version that was unpublished then republished, or a
  maintainer handoff immediately followed by a new release.

When any of these fire, read the actual published tarball contents — not just the
repo — before trusting it.

### 5. Check license and blast radius

- Confirm each new license is compatible with the project (this repo is MIT).
- Flag a small direct dependency that drags in a large or risky transitive tree;
  a lighter alternative is often available.

### 6. Report

Produce a short, severity-ranked findings list. For each finding: the package and
version, the risk, the evidence (command output / metadata), and the
recommendation (pin, upgrade to fixed version, replace, or reject).

## Decision Guidance

- **Reject / do not merge** when a package has a known Critical/High advisory with
  no fixed version, runs an unexplained install script, or shows typosquat/
  fresh-publish red flags.
- **Pin and monitor** when the risk is low but the package is new or fast-moving.
- **Upgrade** when a fixed version exists — prefer the minimal bump that clears
  the advisory.

## Anti-Patterns

- Trusting `npm audit` alone — it misses install-script and typosquat risk.
- Auditing the GitHub repo instead of the **published artifact** — they can differ.
- Enabling lifecycle scripts globally for one native dependency's sake.
- Approving a dependency because CI is green — CI does not vet supply-chain trust.

## Related

- `security-scan` — audits your `.claude/` config surface (AgentShield)
- `differential-review` — first-party diff security review
- `npm run security:ioc-scan` — ECC's post-install IOC scanner
