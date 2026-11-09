---
type: Bundle
title: Chirag's Userscripts
description: A collection of standalone browser userscripts, each in its own repository, installed through ScriptCat and shipped via GitHub raw auto-update.
resource: https://github.com/chirag127
tags: [userscripts, tampermonkey, scriptcat, violentmonkey, youtube, greasyfork]
timestamp: 2026-06-15T00:00:00Z
---

# Chirag's Userscripts — knowledge bundle

This directory is an **Open Knowledge Format (OKF)** bundle describing the userscript
collection. It is written for two audiences at once: a human reading the README, and an
AI agent that needs the collection's structure, decisions and gotchas without reading
every script.

## How to read this bundle

| Path | What it holds |
|------|---------------|
| `index.md` | Bundle entry point — the catalogue of every concept |
| `concepts/` | Ideas that apply across the whole collection (architecture, rules, testing) |
| `scripts/` | One concept note per userscript |
| `sync-okf.mjs` | Copies this bundle into every repository as a scoped copy |

## Keeping copies in sync

The bundle lives here as the **canonical** copy. Every userscript repository also carries a
scoped copy under its own `okf/` so it is self-describing when cloned alone. Never hand-edit a
repository's copy:

```bash
node okf/sync-okf.mjs           # regenerate every repository's copy
node okf/sync-okf.mjs --check   # report drift, change nothing
```

## The collection at a glance

| Script | Repo | Purpose |
|--------|------|---------|
| `yt-hotkey-like-userscript` | [repo](https://github.com/chirag127/yt-hotkey-like-userscript) | `a` → 👍 Like |
| `yt-hotkey-dislike-userscript` | [repo](https://github.com/chirag127/yt-hotkey-dislike-userscript) | `d` → 👎 Dislike |
| `yt-hotkey-next-userscript` | [repo](https://github.com/chirag127/yt-hotkey-next-userscript) | `n` → ⏭️ Next video |
| `yt-hotkey-prev-userscript` | [repo](https://github.com/chirag127/yt-hotkey-prev-userscript) | `p` → ⏮️ Previous video |
| `yt-multiselect-userscript` | [repo](https://github.com/chirag127/yt-multiselect-userscript) | ☑ Bulk select on any YouTube page → Save to **Watch later** / playlist / remove / export |
| `greasyfork-plus-userscript` | [repo](https://github.com/chirag127/greasyfork-plus-userscript) | ⚡ One read-only GreasyFork enhancer |
| `metered-paywall-reset-userscript` | [repo](https://github.com/chirag127/metered-paywall-reset-userscript) | 🔓 Read a metered article from JSON-LD / AMP / archive + reset the meter |
| `coupon-stack-userscript` | [repo](https://github.com/chirag127/coupon-stack-userscript) | 🎯 Promo/coupon/referral autofill + capped sweep + pair stacking |
| `region-select-userscript` | [repo](https://github.com/chirag127/region-select-userscript) | 🌍 Region cookie override + IP-lock "you need a proxy" notice |
| `userscript-install-guide` | [repo](https://github.com/chirag127/userscript-install-guide) | 🧭 Canonical install guide, linked by every script |

## Conventions

- **Every repository MUST carry an OKF bundle.** See
  [concepts/okf-requirement.md](concepts/okf-requirement.md) — a repo without `okf/` is
  incomplete.
- **One script = one repository = one submodule** under `repos/own/public/userscripts/`.
- Every repo carries `README.md`, `AGENTS.md`, and an MIT `LICENSE`.
- Every script sets `@updateURL` / `@downloadURL` to its own raw `main` URL, so it
  self-updates with no platform dependency.
- Install instructions live **once**, in `userscript-install-guide`. Every other README
  links there rather than repeating them.
