// ==UserScript==
// @name         TabSync Notes
// @namespace    https://github.com/chirag127
// @version      1.2.1
// @description  Cross-tab scratch notes and clipboard sharing. Save the current page or selected text as a note from any tab, and see it appear live in every other open tab through ScriptCat's cross-tab storage events. Copy, pin, delete, export. Lives in the ScriptCat menu, shows a panel on demand, and never touches the page when idle.
// @author       chirag127
// @license      MIT
// @match        https://*/*
// @match        http://*/*
// @icon         https://raw.githubusercontent.com/chirag127/x-tabsync-notes-userscript/main/icon.svg
// @homepageURL  https://github.com/chirag127/x-tabsync-notes-userscript
// @supportURL   https://github.com/chirag127/x-tabsync-notes-userscript/issues
// @downloadURL  https://github.com/chirag127/x-tabsync-notes-userscript/raw/main/x-tabsync-notes.user.js
// @updateURL    https://github.com/chirag127/x-tabsync-notes-userscript/raw/main/x-tabsync-notes.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setValues
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_notification
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        CAT_registerMenuInput
// @noframes
// @run-at       document-idle
// ==/UserScript==

/*
 * TabSync Notes
 * =============
 * Why it is built this way
 * ------------------------
 * The interesting capability on this platform is not the DOM — it is the
 * cross-tab storage event. A userscript cannot enumerate open tabs, so the
 * only correct way to make two tabs agree on shared state is to write to
 * manager storage and subscribe to change events. `GM_addValueChangeListener`
 * reports whether a change was `remote` (came from another tab), which is what
 * lets this script notify you about a note you added somewhere else without
 * notifying you in the tab you added it in.
 *
 * Design rules that follow from the platform:
 *
 *  1. One storage key per note (`tsn:note:<id>`) rather than one big array.
 *     Two tabs writing a whole array concurrently will lose a write; separate
 *     keys make concurrent adds safe with no locking.
 *  2. A monotonically decreasing sort key derived from the timestamp, so the
 *     newest note lists first without a sort on every render.
 *  3. The panel is created only on demand and removed on close. Nothing is
 *     injected on pages where you never open it, so the script costs no
 *     layout, no paint and no z-index war on the other 99% of tabs.
 *  4. All text is inserted with textContent. Notes are user text and may
 *     contain anything; HTML injection here would be a self-XSS at best.
 */

(function () {
  "use strict";

  // ── Constants ───────────────────────────────────────────────────────────────

  const PREFIX = "tsn:note:";
  const SETTINGS_KEY = "tsn:settings";
  // A single key every note write also bumps. Every tab subscribes to it, which
  // is how a tab hears about a note created after it loaded — the manager has no
  // working catch-all subscription, so this key is the broadcast channel.
  const SIGNAL_KEY = "tsn:signal";
  const PANEL_ID = "tsn-panel";
  const STYLE_ID = "tsn-style";
  const MAX_TEXT = 20000;

  // ── Diagnostics ────────────────────────────────────────────────────────────
  //
  // `GM_log` is NOT available in every manager — it is absent in the ScriptCat
  // build this was tested against, and calling it unguarded throws a
  // ReferenceError that kills the rest of the script (this actually happened
  // and silently disabled cross-tab sync). Diagnostics therefore go through
  // one wrapper that degrades to the console.
  function diag(...args) {
    try {
      if (typeof GM_log === "function") {
        GM_log(args.join(" "));
        return;
      }
    } catch {
      /* fall through to console */
    }
    try {
      console.debug("[TabSync]", ...args);
    } catch {
      /* nothing left to try; diagnostics must never break the feature */
    }
  }

  const DEFAULT_SETTINGS = {
    // Notify in other tabs when a note arrives. On by default because it is the
    // whole point of a cross-tab tool, but it is one click to silence.
    notifyOnRemoteAdd: true,
    // Copy a note's text to the clipboard when it is captured. Saves a step for
    // the common "grab this, paste it over there" flow.
    copyOnCapture: false,
    // Last panel position as {left, top} fractions of the viewport, so the panel
    // reopens where the user dragged it on any screen size. Null means default.
    panelPos: null,
  };

  // ── Storage layer ───────────────────────────────────────────────────────────

  /**
   * Storage is treated as untrusted. Values survive across script updates and
   * could be corrupt or written by an older schema, so every read is validated
   * rather than assumed. A single bad record must not break the whole panel.
   */
  const store = {
    settings() {
      try {
        const raw = GM_getValue(SETTINGS_KEY, null);
        if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...raw };
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },

    saveSettings(patch) {
      const next = { ...this.settings(), ...patch };
      try {
        GM_setValue(SETTINGS_KEY, next);
      } catch (error) {
        diag("could not save settings: " + error);
      }
      return next;
    },

    /** All valid notes, newest first. Bad records are skipped, not rendered. */
    notes() {
      let keys = [];
      try {
        keys = GM_listValues() || [];
      } catch {
        return [];
      }

      const out = [];
      for (const key of keys) {
        if (typeof key !== "string" || !key.startsWith(PREFIX)) continue;
        let note;
        try {
          note = GM_getValue(key, null);
        } catch {
          continue;
        }
        if (!isValidNote(note)) continue;
        out.push(note);
      }
      return out.sort((a, b) => b.createdAt - a.createdAt);
    },

    add(note) {
      GM_setValue(PREFIX + note.id, note);
      this.signal();
      return note;
    },

    update(note) {
      GM_setValue(PREFIX + note.id, note);
      this.signal();
      return note;
    },

    remove(id) {
      GM_deleteValue(PREFIX + id);
      this.signal();
    },

    /**
     * Broadcast that the note set changed.
     *
     * The value is a timestamp, so it differs on every write; a manager that
     * de-duplicates identical values would otherwise swallow the event.
     */
    signal() {
      try {
        GM_setValue(SIGNAL_KEY, Date.now());
      } catch (error) {
        diag("could not send change signal: " + error);
      }
    },

    keyFor(id) {
      return PREFIX + id;
    },
  };

  function isValidNote(note) {
    return Boolean(
      note &&
        typeof note === "object" &&
        typeof note.id === "string" &&
        typeof note.text === "string" &&
        Number.isFinite(note.createdAt),
    );
  }

  /**
   * Ids must be unique across tabs that may add a note in the same millisecond,
   * so they combine a timestamp with randomness. `crypto.randomUUID` is used
   * where available; the fallback is deliberately still collision-resistant
   * rather than a plain counter.
   */
  function makeId() {
    try {
      if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    } catch {
      /* fall through */
    }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function makeNote(text, extra) {
    const clean = String(text || "").trim().slice(0, MAX_TEXT);
    return {
      id: makeId(),
      text: clean,
      url: location.href,
      title: document.title || location.hostname,
      host: location.hostname,
      createdAt: Date.now(),
      pinned: false,
      ...extra,
    };
  }

  // ── Capture ─────────────────────────────────────────────────────────────────

  /** Selected text on the page, if any. Used by the "capture selection" action. */
  function selectedText() {
    try {
      const active = document.activeElement;
      // Respect a text field's selection: that is what the user means when the
      // caret is in a textarea.
      if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (typeof start === "number" && typeof end === "number" && end > start) {
          return active.value.slice(start, end);
        }
      }
      return String(window.getSelection() || "").trim();
    } catch {
      return "";
    }
  }

  function capture(text, extra) {
    const note = makeNote(text, extra);
    if (!note.text) {
      toast("Nothing to save — no text selected.");
      return null;
    }
    store.add(note);
    const settings = store.settings();
    if (settings.copyOnCapture) copyToClipboard(note.text, true);
    toast("Note saved" + (settings.copyOnCapture ? " and copied" : "") + ".");
    return note;
  }

  /**
   * Clipboard write with a fallback. `GM_setClipboard` is the reliable path
   * inside a userscript; the DOM fallback covers managers that expose the grant
   * but fail silently on non-HTTPS pages.
   */
  function copyToClipboard(text, quiet) {
    let ok = false;
    try {
      if (typeof GM_setClipboard === "function") {
        GM_setClipboard(text, "text");
        ok = true;
      }
    } catch {
      ok = false;
    }

    if (!ok) {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;top:-1000px;left:0;opacity:0;";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      } catch {
        ok = false;
      }
    }

    if (!quiet) toast(ok ? "Copied to clipboard." : "Copy failed.");
    return ok;
  }

  // ── Notification ────────────────────────────────────────────────────────────

  /**
   * `GM_notification` is the best method for telling the user something
   * happened in a tab they are not looking at. It is used only for remote
   * changes; local actions get an in-page toast, because a system notification
   * for something you just did yourself is noise.
   */
  function notify(title, text) {
    try {
      if (typeof GM_notification === "function") {
        GM_notification({ title, text, timeout: 6000 });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  // ── In-page toast ───────────────────────────────────────────────────────────

  let toastEl = null;
  let toastTimer = 0;

  function toast(message) {
    ensureStyle();
    if (!toastEl || !toastEl.isConnected) {
      toastEl = document.createElement("div");
      toastEl.id = "tsn-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.documentElement.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("tsn-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toastEl) toastEl.classList.remove("tsn-visible");
    }, 2600);
  }

  // ── Styling ─────────────────────────────────────────────────────────────────
  // One injected stylesheet, added lazily on first UI use and reused after that.
  // Prefix every class to avoid colliding with the host page.

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      #tsn-toast {
        position: fixed; z-index: 2147483647; left: 50%; bottom: 28px;
        transform: translate(-50%, 12px); opacity: 0; pointer-events: none;
        background: #1f1f22; color: #f3f3f3; border: 1px solid #3a3a3f;
        border-radius: 10px; padding: 10px 16px;
        font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 8px 28px rgba(0,0,0,.45); transition: opacity .18s, transform .18s;
        max-width: min(90vw, 460px);
      }
      #tsn-toast.tsn-visible { opacity: 1; transform: translate(-50%, 0); }

      #${PANEL_ID} {
        position: fixed; z-index: 2147483646; top: 16px; right: 16px;
        width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 32px);
        display: flex; flex-direction: column;
        background: #1a1a1d; color: #ececef; border: 1px solid #35353b;
        border-radius: 14px; overflow: hidden;
        box-shadow: 0 18px 60px rgba(0,0,0,.55);
        font: 13px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      #${PANEL_ID} .tsn-head {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 12px; border-bottom: 1px solid #2d2d33; background: #202024;
        cursor: grab; touch-action: none; user-select: none;
      }
      #${PANEL_ID} .tsn-head.tsn-dragging { cursor: grabbing; }
      #${PANEL_ID} .tsn-title { font-weight: 600; font-size: 13px; letter-spacing: .2px; flex: 1; }
      #${PANEL_ID} .tsn-count {
        font-size: 11px; color: #9a9aa4; background: #2a2a30;
        border-radius: 999px; padding: 1px 8px;
      }
      #${PANEL_ID} button {
        font: inherit; cursor: pointer; border-radius: 8px;
        border: 1px solid #3a3a41; background: #26262c; color: #ececef;
        padding: 4px 9px; line-height: 1.4;
      }
      #${PANEL_ID} button:hover { background: #31313a; }
      #${PANEL_ID} button:focus-visible { outline: 2px solid #6aa9ff; outline-offset: 1px; }
      #${PANEL_ID} .tsn-body { overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
      #${PANEL_ID} .tsn-empty { color: #8b8b95; text-align: center; padding: 26px 12px; }
      #${PANEL_ID} .tsn-note {
        border: 1px solid #303038; border-radius: 10px; background: #212127;
        padding: 9px 10px; display: flex; flex-direction: column; gap: 6px;
      }
      #${PANEL_ID} .tsn-note.tsn-pinned { border-color: #7a5a1f; background: #262219; }
      #${PANEL_ID} .tsn-text {
        white-space: pre-wrap; word-break: break-word; max-height: 7.4em; overflow: hidden;
      }
      #${PANEL_ID} .tsn-meta {
        display: flex; gap: 8px; align-items: baseline;
        font-size: 11px; color: #8b8b95; min-width: 0;
      }
      #${PANEL_ID} .tsn-src {
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;
      }
      #${PANEL_ID} .tsn-actions { display: flex; gap: 6px; }
      #${PANEL_ID} .tsn-actions button { padding: 2px 7px; font-size: 11px; }
      #${PANEL_ID} .tsn-foot {
        display: flex; gap: 8px; padding: 9px 12px;
        border-top: 1px solid #2d2d33; background: #1d1d21;
      }
      #${PANEL_ID} .tsn-foot button { flex: 1; }
      #${PANEL_ID} .tsn-input {
        width: 100%; resize: vertical; min-height: 58px;
        background: #16161a; color: #ececef; border: 1px solid #3a3a41;
        border-radius: 8px; padding: 7px 9px; font: inherit; box-sizing: border-box;
      }
      #${PANEL_ID} .tsn-input:focus-visible { outline: 2px solid #6aa9ff; outline-offset: 1px; }
      #${PANEL_ID} .tsn-compose { padding: 8px 8px 0; display: flex; flex-direction: column; gap: 6px; }
    `;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  // ── Panel ──────────────────────────────────────────────────────────────────

  let panel = null;
  let panelBody = null;
  let panelCount = null;

  function closePanel() {
    if (panel) panel.remove();
    panel = null;
    panelBody = null;
    panelCount = null;
  }

  /** Build one note card. All user text is inserted via textContent, never HTML. */
  function renderNote(note) {
    const card = document.createElement("div");
    card.className = "tsn-note" + (note.pinned ? " tsn-pinned" : "");

    const text = document.createElement("div");
    text.className = "tsn-text";
    text.textContent = note.text;
    card.appendChild(text);

    const meta = document.createElement("div");
    meta.className = "tsn-meta";

    const when = document.createElement("span");
    when.textContent = timeAgo(note.createdAt);
    when.title = new Date(note.createdAt).toLocaleString();
    meta.appendChild(when);

    const source = document.createElement("span");
    source.className = "tsn-src";
    source.textContent = note.host || "";
    source.title = note.title || "";
    meta.appendChild(source);

    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "tsn-actions";

    actions.appendChild(actionButton("Copy", () => copyToClipboard(note.text)));

    actions.appendChild(
      actionButton(note.pinned ? "Unpin" : "Pin", () => {
        store.update(Object.assign({}, note, { pinned: !note.pinned }));
        renderPanel();
      }),
    );

    if (note.url) {
      actions.appendChild(
        actionButton("Open", () => {
          // A same-tab navigation would hide the panel the user is working in.
          window.open(note.url, "_blank", "noopener,noreferrer");
        }),
      );
    }

    actions.appendChild(
      actionButton("Delete", () => {
        store.remove(note.id);
        renderPanel();
        toast("Note deleted.");
      }),
    );

    card.appendChild(actions);
    return card;
  }

  function actionButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  /** Pinned notes first, then newest first within each group. */
  function orderedNotes() {
    const notes = store.notes();
    return notes.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  }

  function renderPanel() {
    if (!panel || !panelBody) return;
    panelBody.textContent = "";

    const notes = orderedNotes();
    if (panelCount) panelCount.textContent = String(notes.length);

    if (!notes.length) {
      const empty = document.createElement("div");
      empty.className = "tsn-empty";
      empty.textContent = "No notes yet. Save this page or a selection from the menu.";
      panelBody.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const note of notes) fragment.appendChild(renderNote(note));
    panelBody.appendChild(fragment);
  }

  function openPanel() {
    ensureStyle();
    if (panel) {
      renderPanel();
      return panel;
    }

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "TabSync notes");

    const head = document.createElement("div");
    head.className = "tsn-head";

    const title = document.createElement("span");
    title.className = "tsn-title";
    title.textContent = "Notes";

    panelCount = document.createElement("span");
    panelCount.className = "tsn-count";
    panelCount.textContent = "0";

    head.append(title, panelCount, actionButton("Close", closePanel));
    panel.appendChild(head);

    const compose = document.createElement("div");
    compose.className = "tsn-compose";

    const input = document.createElement("textarea");
    input.className = "tsn-input";
    input.placeholder = "Write a note\u2026 (Ctrl+Enter to save, Esc to close)";
    input.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        saveFromInput(input);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    });

    const addRow = document.createElement("div");
    addRow.className = "tsn-actions";
    addRow.appendChild(actionButton("Save note", () => saveFromInput(input)));
    addRow.appendChild(
      actionButton("Save selection", () => {
        const text = selectedText();
        if (!text) return toast("Nothing selected on the page.");
        capture(text);
        renderPanel();
      }),
    );

    compose.append(input, addRow);
    panel.appendChild(compose);

    panelBody = document.createElement("div");
    panelBody.className = "tsn-body";
    panel.appendChild(panelBody);

    const foot = document.createElement("div");
    foot.className = "tsn-foot";
    foot.appendChild(actionButton("Copy all", copyAll));
    foot.appendChild(actionButton("Export JSON", exportJson));
    panel.appendChild(foot);

    document.documentElement.appendChild(panel);
    makeDraggable(head);
    applyPosition();
    renderPanel();
    return panel;
  }

  // ── Dragging ───────────────────────────────────────────────────────────────
  //
  // The panel is fixed at the top right by default, which lands directly on top
  // of the sidebar of sites like GitHub or a video page's recommendations. A
  // panel you cannot move is a panel you eventually stop opening, so the header
  // is a drag handle and the position is remembered.

  /**
   * Clamp so the panel can never be dragged out of reach. Keeping at least the
   * width of the header visible means it can always be grabbed again — losing
   * a floating panel off-screen with no way back is the worst outcome here.
   */
  function clampPosition(left, top) {
    const width = panel ? panel.offsetWidth : 420;
    const height = panel ? panel.offsetHeight : 200;
    const margin = 8;

    // The whole panel must stay on screen, not just its header. Clamping only the
    // header let a tall panel hang off the bottom edge, hiding the note list and
    // the footer buttons. When the panel is taller than the viewport, the best
    // that can be done is to pin its top edge and let it scroll internally.
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(margin, window.innerHeight - height - margin);
    return {
      left: Math.min(Math.max(margin, left), maxLeft),
      top: Math.min(Math.max(margin, top), maxTop),
    };
  }

  function applyPosition() {
    if (!panel) return;
    const saved = store.settings().panelPos;
    if (!saved || typeof saved.left !== "number" || typeof saved.top !== "number") return;
    // Stored as viewport fractions so a smaller window still gets a sane spot.
    const left = saved.left * window.innerWidth;
    const top = saved.top * window.innerHeight;
    const spot = clampPosition(left, top);
    panel.style.left = spot.left + "px";
    panel.style.top = spot.top + "px";
    panel.style.right = "auto";
  }

  function makeDraggable(handle) {
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let dragging = false;

    handle.addEventListener("pointerdown", (event) => {
      // Buttons in the header (Close) must stay clickable.
      if (event.target.closest("button")) return;
      if (event.button !== 0) return;
      dragging = true;
      const box = panel.getBoundingClientRect();
      originLeft = box.left;
      originTop = box.top;
      startX = event.clientX;
      startY = event.clientY;
      panel.style.right = "auto";
      panel.style.left = originLeft + "px";
      panel.style.top = originTop + "px";
      handle.classList.add("tsn-dragging");
      // Pointer capture keeps the drag alive even if the cursor leaves the
      // header, which is what makes dragging feel correct rather than jumpy.
      try {
        handle.setPointerCapture(event.pointerId);
      } catch {
        /* capture is a nicety; the move handler still works without it */
      }
      event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const spot = clampPosition(originLeft + (event.clientX - startX), originTop + (event.clientY - startY));
      panel.style.left = spot.left + "px";
      panel.style.top = spot.top + "px";
    });

    const end = (event) => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("tsn-dragging");
      try {
        handle.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      const box = panel.getBoundingClientRect();
      store.saveSettings({
        panelPos: {
          left: box.left / Math.max(1, window.innerWidth),
          top: box.top / Math.max(1, window.innerHeight),
        },
      });
    };

    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  function saveFromInput(input) {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return toast("Nothing to save.");
    capture(text);
    input.value = "";
    renderPanel();
  }

  function copyAll() {
    const notes = orderedNotes();
    if (!notes.length) return toast("No notes to copy.");
    const text = notes.map((note) => note.text + (note.url ? "\n  " + note.url : "")).join("\n\n");
    copyToClipboard(text);
  }

  function exportJson() {
    const notes = orderedNotes();
    if (!notes.length) return toast("Nothing to export.");
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), notes }, null, 2);
    // Clipboard is the dependable export channel here: it needs no extra grant
    // and the user can paste into whatever editor they prefer.
    copyToClipboard(payload);
    toast("JSON copied \u2014 paste into a file.");
  }

  function timeAgo(timestamp) {
    const seconds = Math.round((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + "h ago";
    return Math.round(hours / 24) + "d ago";
  }

  // ── Menu ───────────────────────────────────────────────────────────────────

  const menuIds = [];

  function menu(label, handler) {
    try {
      const id = GM_registerMenuCommand(label, handler);
      if (id !== undefined) menuIds.push(id);
    } catch (error) {
      diag("menu registration failed: " + error);
    }
  }

  menu("\uD83D\uDCDD Open notes panel", openPanel);

  menu("\uD83D\uDD16 Save this page as a note", () => {
    capture(document.title + "\n" + location.href);
  });

  menu("\u2702\uFE0F Save selection as a note", () => {
    const text = selectedText();
    if (!text) return toast("Nothing selected on the page.");
    capture(text);
  });

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  //
  // This is the capability that makes the script worth installing. A storage
  // write in ANY tab fires this listener in EVERY tab, and the `remote` flag
  // separates a write from another tab from one that originated here. Without
  // that flag every tab would notify itself, including the tab that acted.

  /**
   * Subscribe to change events for one note key.
   *
   * A catch-all subscription via `GM_addValueChangeListener(null, ...)` is
   * accepted by this manager but never fires — verified: it returns an id and
   * then stays silent. Per-key subscription is the only thing that works, so
   * every registered key is tracked and unsubscribed when its note goes away.
   */
  const subscriptions = new Map();

  function subscribeTo(key) {
    if (subscriptions.has(key)) return;
    try {
      const id = GM_addValueChangeListener(key, onChange);
      subscriptions.set(key, id);
    } catch (error) {
      diag("could not subscribe to " + key + ": " + error);
    }
  }

  function unsubscribeFrom(key) {
    if (!subscriptions.has(key)) return;
    try {
      if (typeof GM_removeValueChangeListener === "function") {
        GM_removeValueChangeListener(subscriptions.get(key));
      }
    } catch {
      /* a failed unsubscribe only leaks one listener; never fatal */
    }
    subscriptions.delete(key);
  }

  /** Re-subscribe so every existing note is watched, and nothing else is. */
  function syncSubscriptions() {
    // The signal key is permanent: it is the channel that reveals new notes,
    // so it must never be swept away as "no longer live".
    const live = new Set([SIGNAL_KEY]);
    for (const note of store.notes()) {
      const key = store.keyFor(note.id);
      live.add(key);
      subscribeTo(key);
    }
    for (const key of [...subscriptions.keys()]) {
      if (!live.has(key)) unsubscribeFrom(key);
    }
  }

  /**
   * React to a change. Two kinds of key exist:
   *
   *  - a note key  → that specific note was added/updated/deleted. Only remote
   *                  updates are worth a notification.
   *  - the signal  → something in the note set changed. Refresh subscriptions
   *                  and re-render, without notifying (the note's own key
   *                  already carries the notification).
   */
  function onChange(name, oldValue, newValue, remote) {
    if (typeof name !== "string") return;

    if (name === SIGNAL_KEY) {
      syncSubscriptions();
      if (panel) renderPanel();
      return;
    }

    if (name.indexOf(PREFIX) !== 0) return;

    if (panel) renderPanel();
    if (!remote) return;

    const settings = store.settings();
    if (!settings.notifyOnRemoteAdd) return;

    // A deletion arrives as a change whose newValue is undefined. There is
    // nothing to announce, and the panel (if open) already re-rendered.
    if (!isValidNote(newValue)) return;

    notify("New note · TabSync", newValue.text.slice(0, 120));
  }

  function startSync() {
    if (typeof GM_addValueChangeListener !== "function") {
      diag("no cross-tab listener available; notes will not sync live.");
      return;
    }

    // Subscribe to the broadcast channel first: that is what delivers notes
    // created in other tabs after this page loaded.
    subscribeTo(SIGNAL_KEY);

    // Then watch the notes that already exist, so edits and deletions of an
    // existing note are seen immediately.
    for (const note of store.notes()) subscribeTo(store.keyFor(note.id));
  }

  startSync();

  // ── Settings widgets (ScriptCat) ───────────────────────────────────────────
  //
  // CAT_registerMenuInput gives a real toggle in the ScriptCat popup instead of
  // prompt() dialogs. It is ScriptCat-specific, so it is feature-detected: on
  // any other manager the script keeps working with the defaults.

  if (typeof CAT_registerMenuInput === "function") {
    const settings = store.settings();

    try {
      CAT_registerMenuInput(
        "Notify on notes from other tabs",
        (value) => store.saveSettings({ notifyOnRemoteAdd: Boolean(value) }),
        {
          id: "tsn:notifyOnRemoteAdd",
          inputType: "boolean",
          inputDefaultValue: settings.notifyOnRemoteAdd,
          title: "TabSync",
          inputLabel: "Notify on notes from other tabs",
        },
      );

      CAT_registerMenuInput(
        "Copy a note when captured",
        (value) => store.saveSettings({ copyOnCapture: Boolean(value) }),
        {
          id: "tsn:copyOnCapture",
          inputType: "boolean",
          inputDefaultValue: settings.copyOnCapture,
          title: "TabSync",
          inputLabel: "Copy a note when captured",
        },
      );
    } catch (error) {
      diag("settings menu failed: " + error);
    }
  }

  // ── Keyboard shortcut ──────────────────────────────────────────────────────
  //
  // Alt+Shift+N toggles the panel. Never a bare key, and never while typing.

  function isTypingTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(target.isContentEditable);
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== "N" && event.key !== "n") return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      if (panel) closePanel();
      else openPanel();
    },
    true,
  );

  diag("ready on " + location.hostname);
})();
