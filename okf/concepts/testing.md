---
type: Concept
title: Testing rules — trust the screen, not the measurement
description: How to verify a userscript actually works, and the two measurement traps that produced false "it works" conclusions.
tags: [testing, verification, screenshots, debugging]
timestamp: 2026-06-15T00:00:00Z
---

# Testing rules

## The central lesson

**A measurement that is true can still be useless.** Twice in this collection a numeric
check reported success while the feature was visibly broken:

| Trap | What the numbers said | What was actually true |
|------|----------------------|------------------------|
| Shorts tick | badge `width: 26`, `onScreen: true` | Two nested badges per card; the inner one painted last and was **unticked**. The visible badge was the empty one. |
| 3-dot menu | handler attached, no exception thrown | `innerHTML` was blocked by **Trusted Types**, so the menu threw before rendering. `.click()` swallows handler exceptions. |

Rules that follow from those:

1. **Screenshot and look at it.** `sctl page screenshot --activate` plus an image check is the
   only proof a human-facing change works.
2. **Hit-test, don't just measure.** `document.elementFromPoint(cx, cy)` tells you what is
   actually painted on top at that pixel. A badge that is `visible: true` but underneath an
   overlay fails this and passes a rect check.
3. **Count the elements, not just the feature.** 288 lockup elements for 96 Shorts was the
   tell. Unexpected multiples mean nested or duplicated nodes.
4. **`.click()` hides handler exceptions.** To see a real error, call the handler directly in
   a `try/catch`, or install a `window.onerror` listener first.

## Synthetic events lie

- A keyboard event dispatched from page script reaches **every** injection context. It
  over-counts handlers and is not a valid measure of a hotkey's behaviour.
- A real trusted keypress (`sctl page press`) is the valid test.
- To count actual listeners, enumerate them over CDP rather than inferring from behaviour.

## Verification checklist before saying "done"

- [ ] `node --check <file>.user.js` passes.
- [ ] The installed source really is the new version (`sctl get <uuid> -o source | grep @version`).
- [ ] The raw URL returns 200 and the new version (`curl -sL <url> | grep @version`).
- [ ] The feature was exercised **on a real page**.
- [ ] A screenshot was captured and inspected.
- [ ] Destructive actions and counters were checked for double-execution.
