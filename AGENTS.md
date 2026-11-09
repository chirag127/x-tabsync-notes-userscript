# AGENTS.md — x-tabsync-notes-userscript

Single-file userscript. `x-tabsync-notes.user.js` at repo root IS the product. No build, no deps, no bundler.

## 🥇 Prime directive — always use the best method

Always use **the best available method** for every task. This outranks convenience, familiarity, and the fact that something already works.

**If existing code is not using the best method, or is not the best code it can be, change it.** Do not preserve a worse approach to keep a diff small. A small diff is a virtue only while the result is correct.

Rank by: **correct → robust → simple → fast**, in that order. On a tie, pick fewer moving parts and fewer future breakages.

## Method (best method — do not revert to polling or tab enumeration)

A userscript **cannot enumerate open tabs**. Cross-tab state is therefore built as *shared
storage plus a change subscription*, never as tab discovery or polling:

- `GM_addValueChangeListener(null, (name, oldValue, newValue, remote) => …)` — fires in every
  tab. `remote === true` means the write came from another tab; that flag is what stops a
  tab notifying itself.
- One storage key **per note** (`tsn:note:<uuid>`). A single array key loses writes when two
  tabs add concurrently — last write wins with no merge.

## Rules

- One file, zero deps. Bump `@version`; keep `@updateURL`/`@downloadURL` on raw `main`.
- **Validate every stored record on read.** Data survives script updates and may be from an
  older schema; one corrupt note must not break the panel.
- **Never `innerHTML` note text.** Notes are arbitrary user input. Use `textContent`.
- Inject the panel **only on demand** and remove it on close. Nothing on the page when idle.
- Prefix every injected class (`tsn-`) and every storage key (`tsn:`) to avoid collisions.
- `CAT_registerMenuInput` is ScriptCat-only — always feature-detect it so the script still
  runs under Tampermonkey/Violentmonkey on defaults.
- Guard hotkeys with an `isTypingTarget` check; never bind a bare key.

## Out of scope (permanent)

Do not add presence or "last seen" tracking of third parties. This script shares **your**
notes between **your** tabs. Reconstructing another person's activity timeline is
surveillance and is refused regardless of the requesting user's access to the underlying
metadata.

### Learned the hard way (both cost real debugging time)

- **`GM_log` does not exist in ScriptCat.** Calling it unguarded throws
  `ReferenceError: GM_log is not defined`, which kills everything after it — in the first
  version this silently disabled cross-tab sync while the panel still rendered, so the
  failure looked like "sync is broken" rather than "the script died". Never call a `GM_*`
  without a feature check.
- **`GM_addValueChangeListener(null, …)` registers but never fires.** It returns an id and
  then stays silent; there is no working catch-all. Verified empirically. The fix is a
  **broadcast key**: every note write also writes `tsn:signal` with a fresh timestamp, and
  every tab subscribes to that one key. That is what makes a tab hear about notes created
  after it loaded, with no polling.
- A deletion arrives as a change whose `newValue` is `undefined`. Check `isValidNote` before
  announcing anything, or every delete fires a notification with `undefined` text.
- The signal value must be a **timestamp**, not a constant: a manager that de-duplicates
  identical consecutive values would swallow the event.

## Install docs
Shared guide: https://github.com/chirag127/userscript-install-guide — link it, never duplicate install steps.

## Test
`sctl install <raw url>`, open two tabs, use the menu to save a note, confirm the second tab
receives it and that the first tab does not notify itself.

<!-- okf-requirement -->
## 📚 Documentation lives in ONE place (mandatory)

All documentation for every repository in this workspace is **single-sourced** in the
umbrella repository:

```
c:\ws\docs\okf├── bundle.md            collection overview
├── index.md             catalogue of every concept and script note
├── concepts/            shared knowledge (architecture, testing, metadata, …)
└── scripts/             one note per userscript repository
```

### Rules

1. **Never create an `okf/` folder in this repository.** It is not duplicated here, by
   design. There was once a copy in every repo: 278 files describing 42 unique documents,
   with `concepts/architecture.md` physically present 32 times. Every edit had to be
   propagated to 30 repositories and drift was unavoidable.
2. **Never hand-edit a copy.** There are no copies. Edit the canonical file under
   `c:\ws\docs\okf\`.
3. **This repository's note is** `c:\ws\docs\okf\scripts\<repo-name>.md`. If it does not
   exist, add it before adding the script.
4. **Link, do not paste.** In `README.md`, link to the canonical note with a relative path
   from the workspace, e.g. `[documentation](../../../../../docs/okf/scripts/<repo-name>.md)`.
5. **Verify** with `node c:\ws\scripts\check-okf.mjs` — it exits `0` only when nothing is
   duplicated and every repository is linked and documented.
6. When adding a new script: create the repo, add `docs/okf/scripts/<repo-name>.md`, add it
   to the tables in `docs/okf/bundle.md` and `docs/okf/index.md`, then run the checker.

Full detail: `c:\ws\docs\okf\concepts\okf-requirement.md`.
