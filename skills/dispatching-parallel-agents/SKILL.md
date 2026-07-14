---
name: dispatching-parallel-agents
description: Use when you face 2+ independent problems that share no state and have no sequential dependency — dispatch one focused subagent per problem domain and let them run concurrently instead of investigating them one at a time. TRIGGER when multiple unrelated test files fail, several independent bugs surface at once, or distinct subsystems each need investigation. DO NOT TRIGGER when failures are interconnected, need holistic system understanding, or would let agents edit the same files.
metadata:
  origin: superpowers
tools: Read, Grep, Glob, Bash, Task
---

# Dispatching Parallel Agents

Delegate independent problems to multiple specialized subagents at the same time
instead of working them sequentially. One agent per independent problem domain,
running concurrently.

> Adapted from [obra/superpowers](https://github.com/obra/superpowers)
> (`skills/dispatching-parallel-agents`, MIT License) to ECC conventions.

## When to Use

Use parallel dispatch when you have:

- Multiple failures across different test files or subsystems
- Independent problems that need no shared understanding to fix
- Situations where fixing one issue will not resolve the others
- No shared state, and no two agents that would edit the same files

Do **not** use it when:

- Failures are interconnected (one root cause manifests in many places)
- You need a holistic picture of the system before acting
- Agents would contend for the same files, branch, or resource

## How It Works

### 1. Identify independent domains

Group the failures/problems by the component that is actually broken. Each group
must be fixable without knowing anything about the others. If you cannot cleanly
separate them, they are not independent — investigate serially instead.

### 2. Write one focused task per domain

Each subagent prompt must be:

- **Focused** — exactly one problem domain, one clear goal
- **Self-contained** — all context the agent needs (files, repro command,
  constraints) is in the prompt; the agent should not have to ask
- **Specific about deliverables** — say exactly what output you expect back
  (the fix, the failing test now passing, a one-paragraph summary of the cause)

State the constraints explicitly: which files it may touch, which it must not,
and that it must not push, merge, or edit shared config.

### 3. Dispatch in parallel

Issue all the subagent (Task) calls **in a single response** so they execute
concurrently. Do not dispatch one, wait, then dispatch the next — that is just
sequential work with extra overhead.

### 4. Review and integrate

When the agents return:

- Verify no two fixes touched the same lines / conflict with each other
- Apply/keep the fixes
- Run the **full** test suite once at the end to confirm the whole set is green

## Prompt Quality: Do and Don't

| Do | Don't |
|----|-------|
| One clear domain per agent | Bundle several unrelated problems into one agent |
| Include the exact repro command | Assume the agent can guess how to reproduce |
| Name the files in scope and out of scope | Leave file ownership ambiguous (causes conflicts) |
| State the expected output format | Ask for vague "look into it" investigations |

## Example

A debugging session with **6 failures across 3 files**:

1. Group by broken component → 3 independent domains.
2. Write 3 focused prompts, each with its failing test file, the repro command
   (`npm test -- path/to/file.test.js`), and "only edit files under `src/<area>/`".
3. Dispatch all 3 Task calls in one response.
4. All three return fixes with no overlapping edits; run `npm test` once → green.

Result: three independent problems solved concurrently instead of serially,
with zero merge conflicts because each agent owned a disjoint file set.

## Anti-Patterns

- Dispatching agents for problems that share a root cause — they will each patch
  a symptom and none will fix the actual bug.
- Letting two agents edit the same file — the second write silently clobbers the
  first, or you get a conflict you have to untangle by hand.
- Skipping the final full-suite run — per-agent green does not prove the merged
  result is green.
