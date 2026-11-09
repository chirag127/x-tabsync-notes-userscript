---
type: Index
title: Userscripts collection — index
description: Catalogue of every concept in this Open Knowledge Format bundle.
tags: [index, catalog]
timestamp: 2026-06-15T00:00:00Z
---

# Index

Entry point for the bundle. Start at [bundle.md](bundle.md) for the overview, then follow
the concepts below.

## Concepts — how the collection works

| Concept | Note | One-line summary |
|---------|------|------------------|
| **OKF requirement** | **[concepts/okf-requirement.md](concepts/okf-requirement.md)** | **Every repository MUST ship an OKF bundle** |
| Architecture | [concepts/architecture.md](concepts/architecture.md) | One repo per script, wired as a git submodule |
| Userscript metadata | [concepts/userscript-metadata.md](concepts/userscript-metadata.md) | The `==UserScript==` block and auto-update |
| ScriptCat & sctl | [concepts/scriptcat-and-sctl.md](concepts/scriptcat-and-sctl.md) | Manager choice and CLI automation |
| Testing rules | [concepts/testing.md](concepts/testing.md) | Trusted keypresses, screenshots over measurements |
| YouTube DOM notes | [concepts/youtube-dom.md](concepts/youtube-dom.md) | Fragile selectors and their verified shapes |

## Scripts

| Script | Note | Key facts |
|--------|------|-----------|
| `yt-hotkey-like-userscript` | scripts/yt-hotkey-like-userscript.md | Key `a`, v1.0.4 |
| `yt-hotkey-dislike-userscript` | scripts/yt-hotkey-dislike-userscript.md | Key `d`, v1.0.4 |
| `yt-hotkey-next-userscript` | scripts/yt-hotkey-next-userscript.md | Key `n`, v1.0.4 |
| `yt-hotkey-prev-userscript` | scripts/yt-hotkey-prev-userscript.md | Key `p`, v1.0.4 |
| `yt-hotkeys-userscript` | scripts/yt-hotkeys-userscript.md | Six rebindable keys, v1.0.0 |
| `yt-multiselect-userscript` | scripts/yt-multiselect-userscript.md | InnerTube API, v2.3.0 |
| `yt-highest-quality-userscript` | scripts/yt-highest-quality-userscript.md | Quality range + persisted preference, v1.0.0 |
| `greasyfork-plus-userscript` | scripts/greasyfork-plus-userscript.md | Read-only enhancer, v1.0.0 |
| `x-tabsync-notes-userscript` | [scripts/x-tabsync-notes-userscript.md](scripts/x-tabsync-notes-userscript.md) | Cross-tab notes, ScriptCat APIs, v1.1.0 |
| `tiktok-compression-bypass-userscript` | scripts/tiktok-compression-bypass-userscript.md | Highest-bitrate swap, v1.0.0 |
| `tiktok-seek-controls-userscript` | scripts/tiktok-seek-controls-userscript.md | Keys + speed, v1.0.0 |
| `tiktok-live-chat-userscript` | scripts/tiktok-live-chat-userscript.md | Chat log + export, v1.0.0 |
| `tiktok-india-unlock-userscript` | scripts/tiktok-india-unlock-userscript.md | Mirror handoff, v1.0.0 |
| `li-connection-export-userscript` | scripts/li-connection-export-userscript.md | Voyager export, v1.0.0 |
| `li-withdraw-invites-userscript` | scripts/li-withdraw-invites-userscript.md | Bulk withdraw, v1.0.0 |
| `li-viewed-capture-userscript` | scripts/li-viewed-capture-userscript.md | Viewer capture, v1.0.0 |
| `engagement-automation` | scripts/engagement-automation.md | InnerTube engagement queue, v1.0.0 |
| `account-multiplexing` | scripts/account-multiplexing.md | Cookie/storage identity switching, v1.0.0 |
| `rate-limit-dance` | scripts/rate-limit-dance.md | fetch/XHR pacing layer, v1.0.0 |
| `scriptcat-inventory` | scripts/scriptcat-inventory.md | Read-only install drift report, v1.0.0 |
| `ig-unfollow-nonfollowers-userscript` | scripts/ig-unfollow-nonfollowers-userscript.md | Friendship diff + capped bulk unfollow, v1.0.0 |
| `ig-story-viewer-userscript` | scripts/ig-story-viewer-userscript.md | Public story viewer, no follow needed, v1.0.0 |
| `ig-reel-downloader-userscript` | scripts/ig-reel-downloader-userscript.md | Media URL list + sidecar JSON, v1.0.0 |
| `reddit-mass-delete-userscript` | scripts/reddit-mass-delete-userscript.md | Own comments/posts by sub + date, v1.0.0 |

| `x-mass-unfollow-userscript` | scripts/x-mass-unfollow-userscript.md | Bulk-unfollow on X with a reviewable queue, whitelist and protected-account skip rule. |
| `x-tweet-deleter-userscript` | scripts/x-tweet-deleter-userscript.md | Delete your own posts by date range and keyword, with a dry-run list and per-tweet log. |
| `x-thread-export-userscript` | scripts/x-thread-export-userscript.md | Export a whole X thread as Markdown and JSON - author, text, time and media URLs. |
| `x-media-harvest-userscript` | scripts/x-media-harvest-userscript.md | Collect deduped image and video URLs from an X profile, thread or search, then export a list and manifest. |
| `gh-bulk-unfollow-userscript` | scripts/gh-bulk-unfollow-userscript.md | Review everyone you follow on GitHub, then unfollow in bulk with a cap and whitelist. |
| `metered-paywall-reset-userscript` | scripts/metered-paywall-reset-userscript.md | JSON-LD `articleBody` / AMP / archive reader + meter reset, v1.0.0 |
| `youtube-force-h264-userscript` | scripts/youtube-force-h264-userscript.md | Force H.264 over VP9/AV1, no-GPU VM playback, v1.0.0 |
| `coupon-stack-userscript` | scripts/coupon-stack-userscript.md | Promo/coupon/referral autofill + capped sweep + pair stacking, gray new-customer codes, v1.0.0 |
| `region-select-userscript` | scripts/region-select-userscript.md | Client-trust region cookie override + IP-lock "you need a proxy" notice, dry-run → apply → reset, v1.0.0 |
| `udemy-complete-all-userscript` | scripts/udemy-complete-all-userscript.md | One-click course completion via the app's own completion API + DOM quiz fallback, v2.1.0 |

## Supporting repos

| Repo | Role |
|------|------|
| `userscript-install-guide` | The single source of install instructions |
