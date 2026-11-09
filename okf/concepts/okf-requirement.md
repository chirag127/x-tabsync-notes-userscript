---
type: Concept
title: Open Knowledge Format requirement
description: The rule that every repository in this collection must carry an OKF bundle, what each bundle must contain, and how it is kept in sync.
tags: [okf, documentation, requirement, agents, governance]
timestamp: 2026-06-15T00:00:00Z
---

# Open Knowledge Format requirement

## The rule

**Every repository in this collection MUST contain an Open Knowledge Format (OKF) bundle.**

This is not optional and not a nice-to-have. A repository without `okf/` is considered
incomplete, regardless of whether the script itself works.

## Why

- A script alone tells you *what* it does, not *why* — the decisions, the rejected
  alternatives, the fragile selectors, the mistakes that already cost time.
- An agent picking up the repo cold can read `okf/` and avoid repeating known failures.
- The knowledge survives the person who originally debugged it.

## What every repository must contain

```
<repo>/
├── README.md          links to okf/
├── AGENTS.md          restates the OKF requirement for that repo
├── LICENSE            MIT
├── <name>.user.js     the product
└── okf/
    ├── bundle.md      overview
    ├── index.md       catalogue of concepts
    ├── concepts/      all 5 shared concept notes
    └── scripts/       THIS repo's own script note (where one applies)
```

The five shared concept notes are:

| Note | Subject |
|------|---------|
| `concepts/architecture.md` | One repo per script, submodule mechanics |
| `concepts/userscript-metadata.md` | `==UserScript==` block and auto-update |
| `concepts/scriptcat-and-sctl.md` | Manager choice, CLI automation, approval traps |
| `concepts/testing.md` | Verify with screenshots, not measurements |
| `concepts/youtube-dom.md` | Verified selectors, the Shorts nesting trap |

## Scoped, not duplicated wholesale

A repository ships **its own** script note plus **all** shared concept notes. It does not ship
other repositories' script notes. Scoped copies therefore must contain no links to notes they
do not contain — `sync-okf.mjs` neutralises those links automatically.

## How it is maintained

The canonical bundle lives in the collection folder:

```
repos/own/public/userscripts/okf/
```

Never hand-edit a repository's `okf/` copy. Edit the canonical bundle, then regenerate:

```bash
node okf/sync-okf.mjs           # write every repository's copy
node okf/sync-okf.mjs --check   # report drift; exit 1 if stale
```

## When adding a new script

1. Create the repository with `README.md`, `AGENTS.md`, `LICENSE`, `<name>.user.js`.
2. Add a note at `okf/scripts/<repo-name>.md` in the **canonical** bundle.
3. Add the script to the tables in `okf/bundle.md` and `okf/index.md`.
4. Run `node okf/sync-okf.mjs`.
5. Confirm `node okf/sync-okf.mjs --check` exits 0.

## Checklist for review

- [ ] `okf/bundle.md` and `okf/index.md` exist
- [ ] all 5 concept notes are present
- [ ] the repo's own script note exists in `okf/scripts/`
- [ ] `README.md` links to `okf/`
- [ ] `AGENTS.md` restates this requirement
- [ ] `node okf/sync-okf.mjs --check` exits 0
- [ ] no broken local links inside `okf/`
