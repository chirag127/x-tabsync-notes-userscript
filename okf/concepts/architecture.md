---
type: Concept
title: Architecture — one repo per script, one submodule per repo
description: Why the collection uses separate GitHub repositories wired into a monorepo as git submodules, and the exact path convention.
tags: [architecture, git, submodules, monorepo]
timestamp: 2026-06-15T00:00:00Z
---

# Architecture

## Decision

**One userscript = one public GitHub repository = one git submodule.**

Every repository lives under:

```
c:\ws\repos\own\public\userscripts\<name>-userscript\
```

and is registered in the monorepo at `C:\ws` as a submodule with a `160000` gitlink.

## Why not a single monorepo for all scripts

| Reason | Detail |
|--------|--------|
| ⭐ Independent visibility | Each script earns its own stars and shows separately on the GitHub profile. |
| 🔄 Per-repo platform sync | GreasyFork and OpenUserJS GitHub-sync are configured **per repository**. One repo with five scripts cannot sync five listings cleanly. |
| 🧹 Clean history | Bug reports and commits stay scoped to one script. |
| 🔍 Discoverability | Separate repos each rank for the `userscript` topic. |

## Why not an atomic script per tiny feature

A split is only justified when the scripts are **genuinely independent**. The YouTube
multiselect work started as five fragments (`bulk-select`, `filter-select`, `select-smart`,
`playlist-tools`, `load-entire-page`) and that was wrong: they all served one job. They were
merged into `yt-multiselect-userscript`.

Rule of thumb:

- **Independent, each usable alone** → separate repos (the four hotkeys).
- **Steps of one workflow** → one repo, one script.

## Submodule mechanics that actually bit us

- `git mv` on a submodule directory fails with **`Permission denied`** on Windows when an
  editor has a file open inside it. The fix is to `cp -r` to the new path, rewrite the
  `[submodule "..."]` section name **and** `path` in `.gitmodules`, `git rm --cached` the old
  path, then `git add` the new one.
- Always confirm the result with `git ls-files -s | grep <name>` — a correct entry shows
  mode `160000`.
- `git mv old new && echo ok` is misleading: the `&&` reports the exit status of the last
  pipeline element (`head`), not `git mv`. Check the filesystem, not the exit code.
