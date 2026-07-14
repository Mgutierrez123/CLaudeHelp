---
name: finishing-a-development-branch
description: Use when development work on a branch is complete and you need to conclude it cleanly — verify tests pass, detect whether you are in a normal repo or a git worktree, then present a small fixed set of options (merge locally, push and open a PR, keep as-is, discard) and execute the chosen one with safe cleanup. TRIGGER when a feature/fix branch is done and the user asks to wrap up, merge, or open a PR. DO NOT TRIGGER mid-development or while tests are red.
metadata:
  origin: superpowers
tools: Read, Bash
---

# Finishing a Development Branch

Conclude completed branch work through a fixed, safe sequence: verify tests →
detect environment → present structured options → execute the choice → clean up.

> Adapted from [obra/superpowers](https://github.com/obra/superpowers)
> (`skills/finishing-a-development-branch`, MIT License) to ECC conventions.

## When to Use

- A feature or fix branch is complete and the user wants to wrap it up
- After a `subagent-driven-development` final review comes back clean
- Any time you are about to merge, open a PR, or discard branch work

Do not run this while development is still in progress or while tests are red.

## The Six Steps

### 1. Verify tests pass

Run the project's suite first (`npm test`, `node tests/run-all.js`, `cargo test`,
`pytest`, etc.). If anything fails, **halt** and show the failures. Never present
finishing options over a red suite.

### 2. Detect environment state

Determine whether you are in a normal repository or a git worktree — compare
`git rev-parse --git-dir` and `git rev-parse --git-common-dir`. This drives both
the menu you present and the cleanup behavior.

### 3. Determine the base branch

Identify the target branch (usually `main` or `master`) via `git merge-base`, or
ask the user to confirm if it is ambiguous. Respect any repo policy that pins the
working branch.

### 4. Present structured options

Keep descriptions to one line each — no essays.

- **Normal repo → exactly 4 options:**
  1. Merge locally into the base branch
  2. Push and open a pull request
  3. Keep the branch as-is
  4. Discard the branch
- **Detached-HEAD worktree → 3 options:** omit "merge locally".

### 5. Execute the chosen action

- **Merge locally:** checkout base, pull, merge the feature branch, **re-run the
  tests after merging**, then go to cleanup.
- **Push & PR:** push the branch and open the PR; **preserve** the worktree so the
  user can iterate on review feedback.
- **Keep:** report that it is preserved; no cleanup.
- **Discard:** require the user to type `discard` to confirm, then go to cleanup.

### 6. Clean up the workspace

Only for **Merge locally** and **Discard**. Determine worktree ownership: if this
skill created it (path contains `.worktrees/` or `worktrees/`), remove it with
`git worktree remove` then `git worktree prune`. If it was created externally,
leave it in place. Always `cd` to the main repo root **before** removing a
worktree.

## Critical Rules

**Never:**

- Proceed with failing tests
- Merge without re-verifying tests post-merge
- Delete work without an explicit typed `discard` confirmation
- Run `git worktree remove` from inside the target worktree
- Delete a branch before removing its worktree
- Remove an externally-managed worktree

**Always:**

- Verify tests before presenting options
- Detect the environment first
- Present exactly 4 (normal) or 3 (worktree) options
- Confirm destructive actions
- Clean up only for options 1 and 4
- `cd` to the main root before worktree removal

## Common Pitfalls

- Skipping test verification → broken merges land on the base branch.
- Open-ended "what do you want to do?" prompts → ambiguity; use the fixed options.
- Cleaning up the worktree on the Push & PR path → removes assets the user needs
  for review feedback.
- Running worktree removal from inside the target directory → fails silently.

## Related Skills

- `subagent-driven-development` — the workflow that typically precedes this one
- `dispatching-parallel-agents` — for independent problem solving before finishing
