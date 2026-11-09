# 📝 TabSync Notes

Cross-tab scratch notes and clipboard sharing for **ScriptCat**. Save the current page or a selection as a note from any tab, and it appears live in every other open tab.

## Install
First read the shared **[userscript install guide](https://github.com/chirag127/userscript-install-guide)** (how to set up ScriptCat/Tampermonkey). Then click:
**[Install x-tabsync-notes.user.js](https://github.com/chirag127/x-tabsync-notes-userscript/raw/main/x-tabsync-notes.user.js)**

> Best experience in **ScriptCat** — it provides the cross-tab change events and the settings toggles. Under Tampermonkey/Violentmonkey the script still runs on defaults.

## Use

| Action | How |
|--------|-----|
| Open the notes panel | Menu ▸ 📝 Open notes panel — or **Alt + Shift + N** |
| Save the current page as a note | Menu ▸ 🔖 Save this page as a note |
| Save selected text | Menu ▸ ✂️ Save selection as a note |
| Add a typed note | Open the panel, type, **Ctrl + Enter** |
| Copy a note | **Copy** on the note card |
| Copy everything | **Copy all** in the panel footer |
| Export as JSON | **Export JSON** (copies to clipboard) |
| Pin / delete | **Pin**, **Delete** on the note card |
| Move the panel | Drag its header — the position is remembered across tabs and reloads |

Notes sync **live across tabs**: save one in a tab and it appears in every other tab that has the panel open, with a system notification when a note arrives from elsewhere. The tab you acted in never notifies itself.

Two toggles live in the ScriptCat popup: *notify on notes from other tabs* and *copy a note when captured*.

## Why a userscript can do this

A userscript cannot enumerate open tabs — but it does not need to. ScriptCat's storage layer is shared across tabs and fires change events, so the script keeps one storage key per note and subscribes to changes. Tab discovery would be both impossible and unnecessary.

## Privacy
Everything stays in your own browser profile, under the `tsn:` storage prefix. No network requests, no analytics, no third-party data. This script shares **your** notes between **your** tabs and touches nobody else's activity.

## License
[MIT](LICENSE) © 2026 chirag127
<!-- okf-bundle -->
## 🧠 Knowledge bundle (OKF)

This repository ships its documentation as an
**Open Knowledge Format** bundle in `okf/` —
written so both a human and an AI agent can understand the script without reading the code.

| File | Contents |
|------|----------|
| `okf/bundle.md` | Overview of the collection |
| `okf/index.md` | Catalogue of concepts |
| `okf/concepts/` | Shared knowledge (architecture, metadata, testing, ScriptCat/sctl notes) |
| `okf/scripts/` | This script's own note (`x-tabsync-notes-userscript.md`) |

Regenerate every repository's copy from the canonical bundle with `node okf/sync-okf.mjs`.
