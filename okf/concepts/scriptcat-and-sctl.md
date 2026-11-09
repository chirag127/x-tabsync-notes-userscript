---
type: Concept
title: ScriptCat and sctl
description: Which userscript manager the collection targets, and how the sctl CLI is used to install, inspect and delete scripts programmatically.
tags: [scriptcat, sctl, automation, cli]
timestamp: 2026-06-15T00:00:00Z
---

# ScriptCat and sctl

## Manager choice

**ScriptCat** is the primary target in this collection:

- it is the most feature-complete open manager (background scripts, cron, `GM_*` breadth);
- it ships **sctl**, a CLI that lets a script be installed, inspected and deleted without
  clicking through the UI;
- scripts written with `@grant none` still run unchanged in Tampermonkey and Violentmonkey.

So: build for ScriptCat, keep the code portable enough that Tampermonkey and Violentmonkey
work too. Never use a `GM_*` API unless the feature genuinely needs it.

## sctl essentials

| Task | Command |
|------|---------|
| List installed scripts (JSON) | `sctl get -o json` |
| Read a script's installed source | `sctl get <uuid> -o source` |
| Install from URL | `sctl install <raw-url>` |
| Delete | `sctl delete <uuid>` |
| Connection state | `sctl status` |

Install from the **raw GitHub URL**, not a local path. URL installs carry the
`@updateURL`/`@downloadURL` metadata, so ScriptCat can check for updates later; local-file
installs are treated as static and get no update tracking.

## Gotchas that cost real time

- **Write approval.** Deleting or installing can require a browser confirmation, depending
  on the External Access policy. In a loop, a batch of deletes fails **silently** while a
  single delete succeeds (it gets the one available approval). Fix: either set Write
  operations to *Allow directly*, or delete one at a time.
- **`timeout` kills approvals.** Wrapping `sctl delete` in `timeout 20` aborts it while it is
  waiting for approval, so the delete never happens.
- **Stale UUID lists.** Never cache a list of UUIDs and loop over it: the set shifts as
  scripts are removed and you get `NOT_FOUND`. Re-query, delete one, repeat.
- **Busy browser.** Repeated debugger attach/detach can wedge a tab; `sctl page reload` or a
  fresh tab recovers it.
