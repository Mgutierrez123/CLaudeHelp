---
name: mobile-app-security
description: Use when reviewing a mobile app (Android APK / iOS) for security — hunt hardcoded secrets and API keys, misconfigured Firebase/backend endpoints, exported components and insecure IPC, weak local storage, and insecure network config. TRIGGER when auditing an APK/IPA or mobile source tree, or before shipping a mobile release. DO NOT TRIGGER for web/backend code (use differential-review / static-analysis) or dependency risk (use supply-chain-risk-auditor).
metadata:
  origin: ECC
tools: Read, Grep, Glob, Bash
---

# Mobile App Security Review

Review a mobile application — an Android APK, an iOS build, or the source tree —
for the security issues that are specific to mobile: secrets baked into the
package, misconfigured backends (Firebase, S3, open APIs), exported components and
insecure IPC, weak local storage, and permissive network configuration.

> Methodology inspired by the [Trail of Bits skills](https://github.com/trailofbits/skills)
> firebase-apk-scanner and mobile audit workflows (CC-BY-SA-4.0), aligned to the
> OWASP MASVS/MASTG categories. This skill is original ECC text; no upstream prose
> is reproduced.

## When to Use

- Auditing a shipped `.apk`/`.aab`/`.ipa` you can unpack
- Reviewing a mobile source tree (Android/Kotlin/Java, iOS/Swift, Flutter, RN)
  before a release
- Investigating a reported leak that traces back to a mobile client

For server-side or web code, use `differential-review` / `static-analysis`.

## Unpack First (Android)

```bash
# Decode resources + manifest to readable form
apktool d app.apk -o app_src

# Or just pull the file tree / classes
unzip app.apk -d app_unzipped
```

The client ships to the attacker's device — assume everything in the package is
readable. Anything secret in the APK is not secret.

## What to Look For

| Category (OWASP MASVS) | What you are hunting | Where |
|------------------------|----------------------|-------|
| Secrets / keys | Hardcoded API keys, tokens, private keys, JWT signing keys | strings, resources, `res/values/`, native libs |
| Backend config | Firebase DB URLs, open storage buckets, unauthenticated APIs | `google-services.json`, config plists, base URLs |
| Platform / IPC | `exported=true` components, weak intent filters, deep links | `AndroidManifest.xml`, URL schemes (iOS) |
| Local storage | Plaintext credentials/PII in SharedPreferences, SQLite, files | app data dirs, `NSUserDefaults`, Keychain misuse |
| Network | Cleartext traffic, disabled TLS validation, bad pinning | `network_security_config.xml`, ATS exceptions |
| Crypto | Hardcoded keys/IVs, ECB mode, weak/legacy algorithms | crypto call sites |
| Logging | Secrets/PII written to logcat / console | logging call sites |

## How It Works

### 1. Hunt secrets in the package

```bash
# API keys, tokens, private key material
grep -rEi 'api[_-]?key|secret|password|token|BEGIN (RSA|EC|PRIVATE) KEY' app_src/
grep -rEi 'AIza[0-9A-Za-z_-]{35}' app_src/         # Google API key format
```

Check `res/values/strings.xml`, embedded config files, and native `.so` strings.
Treat any live key as compromised — the fix is to rotate it and move the secret
server-side, not to obfuscate it.

### 2. Check backend configuration

- **Firebase:** read `google-services.json` / the Realtime DB URL. Probe whether
  the database or storage rules are world-readable/writable (the classic
  "test mode" leak). Report open rules as Critical.
- **Cloud storage / APIs:** identify base URLs and test whether endpoints that
  return user data require authentication.

### 3. Review the manifest and IPC surface (Android)

In `AndroidManifest.xml`, flag every `android:exported="true"` activity,
service, receiver, or provider — each is callable by other apps. Confirm each
exported component actually needs to be, and enforces permission checks. Review
deep-link / custom-scheme handlers for input that reaches a sink. On iOS, review
custom URL schemes and universal links the same way.

### 4. Inspect local storage

Look for credentials, tokens, or PII stored in plaintext SharedPreferences,
unencrypted SQLite, or files on external storage. On iOS, check for secrets in
`NSUserDefaults` instead of the Keychain, and Keychain items with overly
permissive accessibility. Sensitive data at rest should be encrypted or held in
the platform keystore.

### 5. Check network security config

- **Android:** read `res/xml/network_security_config.xml` — flag
  `cleartextTrafficPermitted="true"` and any `trust-anchors` that trust user CAs.
- **iOS:** flag `NSAllowsArbitraryLoads` and other App Transport Security
  exceptions in `Info.plist`.
- Flag any code that disables certificate validation (custom `TrustManager`,
  `hostnameVerifier` returning true, etc.).

### 6. Report

Severity-ranked findings, each with: the file/component, the concrete risk (what
an attacker on the device or network can do), evidence, and the fix. Prioritize
live secrets and open backends — those are exploitable remotely and immediately.

## Severity Guidance

- **Critical:** live secret/API key in the package; world-writable Firebase/storage
  rules; unauthenticated endpoint returning user data; disabled TLS validation.
- **High:** exported component with no permission check reaching sensitive action;
  plaintext credentials at rest.
- **Medium:** cleartext traffic allowed; PII in logs; weak crypto config.

## Anti-Patterns

- "Fixing" a leaked key by obfuscating it in the client — it is still extractable;
  rotate and move it server-side.
- Auditing only the source and never the built package — the shipped artifact can
  contain generated config and secrets the source does not show.
- Assuming an exported component is safe because the app does not call it that way
  — other apps can.

## Related

- `supply-chain-risk-auditor` — third-party SDK/dependency risk in the app
- `static-analysis` — Semgrep/CodeQL rules for mobile source
- `security-scan` — ECC's `.claude/` config auditor (AgentShield)
