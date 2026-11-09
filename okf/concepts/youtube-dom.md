---
type: Concept
title: YouTube DOM notes
description: Verified selectors for YouTube's current build, the video-ID scheme, and which DOM shapes are stable versus liable to change.
tags: [youtube, dom, selectors, innertube]
timestamp: 2026-06-15T00:00:00Z
---

# YouTube DOM notes

## Video cards

Cards are not one element type. Match the container, then find the video id inside it.

| Surface | Container |
|---------|-----------|
| Search results | `ytd-video-renderer` |
| Home / grid | `ytd-rich-item-renderer`, `ytd-rich-grid-media` |
| Channel grid | `ytd-grid-video-renderer` |
| Playlist page | `ytd-playlist-video-renderer` |
| Playlist sidebar | `ytd-playlist-panel-video-renderer` |
| Newer lockup UI | `yt-lockup-view-model` |
| Shorts (shelf and grid) | `ytm-shorts-lockup-view-model`, `ytm-shorts-lockup-view-model-v2` |

Video id extraction:

```js
/(?:[?&]v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/
```

## Shorts: the nesting trap

A Shorts shelf **nests** `ytm-shorts-lockup-view-model` inside another instance of itself.
A naive `querySelectorAll` therefore returns roughly 3× the real count (288 elements for
96 Shorts), and any per-element decoration gets applied two or three times at identical
coordinates. Always skip a card that contains another card of the same kind:

```js
function hasNestedCard(card) {
  for (const sel of CARD_SELS) {
    if (card.matches(sel) && card.querySelector(sel)) return true;
  }
  return false;
}
```

## Player controls

| Control | Selector |
|---------|----------|
| Like | `like-button-view-model button` |
| Dislike | `dislike-button-view-model button` |
| Next | `.ytp-next-button` |
| Previous | `.ytp-prev-button` |

## Trusted Types

YouTube enforces Trusted Types. `element.innerHTML = "<b>hi</b>"` **throws**, and because
the throw happens inside an event handler it produces no visible error. Build nodes instead:

```js
const span = document.createElement("span");
span.textContent = "label";   // never innerHTML
```

## Keyboard

YouTube already binds `k j l m f c t i` and `shift+n` / `shift+p`. Custom hotkeys must avoid
these. The collection uses `a` (like), `d` (dislike), `n` (next), `p` (previous).

A hotkey must not fire while the user is typing — check `input`, `textarea`,
`contenteditable` and `isContentEditable` before acting.
