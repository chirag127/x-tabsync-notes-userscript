---
type: Concept
title: Userscript metadata and auto-update
description: The ==UserScript== block conventions used across the collection, and how GitHub raw URLs provide self-updating scripts.
tags: [userscript, metadata, auto-update, greasyfork]
timestamp: 2026-06-15T00:00:00Z
---

# Userscript metadata

## The block

Every script opens with the `==UserScript==` block. The fields that matter here:

```js
// ==UserScript==
// @name         <Human name>
// @namespace    https://github.com/chirag127
// @version      1.0.0
// @description  One sentence, what it does and where.
// @author       chirag127
// @license      MIT
// @match        https://www.youtube.com/*
// @downloadURL  https://github.com/chirag127/<repo>/raw/main/<file>.user.js
// @updateURL    https://github.com/chirag127/<repo>/raw/main/<file>.user.js
// @grant        none
// @noframes
// @run-at       document-idle
// ==/UserScript==
```

## Rules

| Field | Rule |
|-------|------|
| `@version` | Bump on **every** change. Semver. Managers compare this to decide whether to update. |
| `@downloadURL` / `@updateURL` | Both point at the repo's own raw `main` file. This is the entire update mechanism. |
| `@grant` | `none` unless the script truly needs `GM_*`. `@grant none` keeps it portable across managers. |
| `@noframes` | Always set for DOM scripts. Without it the script may run inside same-origin iframes and double-fire. |
| `@run-at` | `document-idle` for scripts that need the page rendered. |
| `@match` | Only real target domains. No over-broad matches for convenience. |

## `.user.js` at the repository root

The file sits at the repo root, never in a `scripts/` subfolder. GreasyFork and OpenUserJS
GitHub-import expect a predictable path, and the raw install URL stays short.

## Auto-update reality

- Managers poll `@updateURL` on a schedule. GitHub raw is served with
  `Cache-Control: max-age=300`, so a freshly pushed version can take **up to ~5 minutes**
  to appear. A reinstall immediately after a push may silently fetch the old file — verify
  the installed source, not the intent.
- GreasyFork and OpenUserJS have **no upload API**. Automation is only possible through
  their per-repo GitHub sync (one webhook per repository, set up once by hand).

## Listing platforms

| Platform | Upload | Automation |
|----------|--------|-----------|
| ScriptCat store | Manual | No public submission API |
| GreasyFork | Manual or GitHub import | GitHub sync webhook, per repo |
| OpenUserJS | Manual or GitHub import | GitHub sync webhook, per repo |
| GitHub (raw) | `git push` | Fully scriptable |
