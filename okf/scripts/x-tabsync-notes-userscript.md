---
type: Script
title: TabSync Notes
description: Cross-tab scratch notes and clipboard sharing for ScriptCat. Save the current page or selection from any tab and watch it appear live in every other open tab through GM_addValueChangeListener.
repo: https://github.com/chirag127/x-tabsync-notes-userscript
install: https://github.com/chirag127/x-tabsync-notes-userscript/raw/main/x-tabsync-notes.user.js
version: "1.2.1"
tags: [userscript, scriptcat, cross-tab, clipboard, gm-api]
timestamp: 2026-11-08T00:00:00Z
---

# TabSync Notes

A userscript **cannot enumerate open tabs**. That constraint sounds like a blocker for a
cross-tab tool, but it is not: the platform's storage layer is shared across tabs and
fires change events, so the correct design is *shared state plus a subscription*, not
tab discovery.

## Why `GM_addValueChangeListener` is the whole idea

A write in any tab fires the listener in every tab, and the callback's fourth argument
(`remote`) says whether the write came from elsewhere. That flag is what prevents every
tab — including the one that acted — from notifying itself.

## Storage layout

| Key | Contents |
|-----|----------|
| `tsn:settings` | `{ notifyOnRemoteAdd, copyOnCapture }` |
| `tsn:note:<uuid>` | one record per note |

**One key per note is deliberate.** Two tabs appending to a single array key will lose a
write, because the last write wins with no merge. Separate keys make concurrent adds safe
with no locking — the platform provides the atomicity per key.

Reads are validated, not trusted: a corrupt record from an older schema is skipped rather
than allowed to break the whole panel.

## UI decisions

- The panel is created **on demand** and removed on close. Nothing is injected into the
  ~99% of tabs where the panel is never opened, so there is no layout cost and no z-index
  conflict with the host page.
- All note text is inserted with `textContent`. Notes are arbitrary user text; any
  `innerHTML` path here would be a self-XSS waiting to happen.
- One stylesheet, injected lazily, every class prefixed `tsn-`.
- Alt+Shift+N toggles the panel and never fires while typing.
- The header is a **drag handle**, and the position is remembered as a viewport
  fraction so it reopens sensibly at any window size. A panel you cannot move is
  a panel you eventually stop opening — the default top-right corner covers the
  sidebar on GitHub and the recommendations on a video page.

## ScriptCat-specific surface used

| API | Use |
|-----|-----|
| `GM_addValueChangeListener` | cross-tab sync, `remote` flag drives notifications |
| `GM_getValue`/`GM_setValue`/`GM_setValues`/`GM_listValues`/`GM_deleteValue` | note store |
| `GM_notification` | alert in a tab you are not looking at |
| `GM_setClipboard` | copy note / copy all / JSON export |
| `GM_registerMenuCommand` | panel, save page, save selection |
| `CAT_registerMenuInput` | real boolean toggles in the ScriptCat popup instead of `prompt()` |
| `GM_addStyle`, `GM_log` | styling, diagnostics |

`CAT_registerMenuInput` is ScriptCat-only and is feature-detected, so the script still works
under Tampermonkey/Violentmonkey with default settings.

## Deliberately not built

A "last seen / online status" logger was requested alongside this script and was **not**
built. Reconstructing a timeline of when a specific person was active is surveillance of an
individual, regardless of the data being technically visible to the requester. This script
shares *your* notes between *your* tabs and touches no third party.
