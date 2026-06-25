# Plan: layout fixes, save/share, footer note, production handoff, GitHub push

Status: planning only — nothing in this document has been implemented yet.

## 1. Footer address field — fix sizing

**Problem:** `#footer-address` is a `<textarea>` with no explicit `rows`, so it falls back to the browser default (2 rows), forcing a scrollbar for the two-line default address.

**Fix:**
- Add `rows="3"` (or `4`, for headroom) directly on the `<textarea id="footer-address">` in `index.html`.
- In `src/style.css`, give `textarea` the same `width: 100%` treatment `input[type='text']` already has, plus `resize: vertical` so the user can still grow it manually if they add lines, and `font-family: inherit` so it doesn't render in the browser's monospace default.
- No JS changes needed — this is pure markup/CSS.

## 2. Preview should not jump to top on reload

**Problem:** `previewIframe.srcdoc = assembledHtml` replaces the entire iframe document on every update, which resets scroll position to 0. This happens on every keystroke (debounced 200 ms), so any scrolled-down preview snaps back to the top constantly.

**Fix:** Capture and restore scroll position across `srcdoc` reassignment in `updatePreview()`:
1. Before setting `srcdoc`, read `previewIframe.contentWindow?.scrollY` (and `scrollX`, for completeness) into local variables. Guard with try/catch or an `instanceof` check — reading `contentWindow` of a cross-origin-ish `srcdoc` document is same-origin in practice (srcdoc inherits the parent origin) so this is safe, but the iframe may not have loaded yet on first call.
2. After setting `srcdoc`, attach a one-time `load` listener on the iframe that calls `previewIframe.contentWindow?.scrollTo(scrollX, scrollY)`.
3. Because `updatePreview` runs frequently, make sure only one `load` listener is active at a time (use `{ once: true }` and/or store the handler and remove the previous one before adding a new one) to avoid listener buildup.

This is a small, self-contained change confined to `updatePreview()` in `src/main.ts`.

## 3. Save/share progress as an export/import string (template files)

**Goal:** Let a user export their current in-progress edits as a portable file/string, send it to someone else (or keep it as a backup), and re-import it later to resume — independent of localStorage, which never leaves the browser.

**Design:**
- Reuse the existing `PersistedState` interface and `collectState()` / `applyState()` functions — they already capture/restore everything needed. This feature is "the same serialization localStorage already uses, but exposed as a file the user can move around."
- **Export progress button:** serialize `collectState()` to `JSON.stringify(state, null, 2)`, wrap in a `Blob` with `type: 'application/json'`, and trigger a download named `asta-newsletter-draft.json` — mirroring the existing `exportHtml()` pattern (object URL + hidden `<a download>` + revoke).
- **Import progress button:** trigger a hidden `<input type="file" accept="application/json">`, read the selected file via `FileReader`/`file.text()`, `JSON.parse()` it, and call `applyState({ ...defaultState(), ...parsed })` (same merge-with-defaults safety net `loadState()` already uses for forward/backward compatibility if fields get added/removed later). Wrap the parse in try/catch; on failure show a brief inline error (e.g. reuse the `copy-feedback`-style transient message pattern) instead of throwing.
- After a successful import, call `updatePreview()` so the change is immediately visible and also written to localStorage (so refreshing the page after an import doesn't lose it).
- **Placement:** add two buttons — "Export progress" and "Import progress" — in the same `.button-row` as `toggle-english`, per the request ("next to the toggle English button"). That row becomes: `English: On/Off` | `Export progress` | `Import progress`.
- **Naming clarity:** call the exported artifact a "draft" (not "template" — that word is already used for `template.html`, the AStA corporate template) to avoid confusion in the UI and filenames. E.g. button labels: "Export Draft" / "Import Draft", file name `asta-newsletter-draft.json`.
- LocalStorage autosave behavior is unchanged and stays as-is; this is purely an additional manual export/import path layered on the same state shape.

**Files touched:** `index.html` (two new buttons + hidden file input), `src/main.ts` (two new handler functions `exportDraft()` / `importDraft()`, wired in `init()`), no changes to `src/style.css` needed beyond reusing `.button-row button` styling.

## 4. Responsive preview behavior

**Current behavior:** `.panel-right` (preview column) is `position: sticky; top: 16px; height: calc(100vh - 32px)` on wide screens, and on screens < 900px it becomes `position: static; height: 60vh` — which truncates the preview to 60% of viewport height with an inner scrollbar, per the bug report.

**Wide-screen target (≥ 900px):** keep current behavior — preview fixed/sticky in the viewport with its own scrollbar, not moving as the left panel is scrolled. The request says explicitly "In the wide screen mode however keep the behavior" and "the html preview should be fixed and not move, whilst having a scrollbar at the side like implemented atm" — so item 4 and item 5 (fixed header) interact: once the header becomes `position: fixed`, the preview's sticky offset and height calc must account for the header's actual height instead of the current hardcoded `16px` / `32px` (which assumed the header scrolled away with the page). This is detailed in section 5.

**Small-screen target (< 900px):** instead of a capped `60vh` with internal scroll, let the iframe expand to its full content height so the whole email is visible inline as part of normal page scroll (no nested scrollbar). Approach:
- Drop `height: 60vh` and `overflow` constraints on `.panel-right` in the mobile media query.
- Set the iframe's height dynamically to match its content: on `load`, read `previewIframe.contentWindow.document.documentElement.scrollHeight` and set `previewIframe.style.height = `${scrollHeight}px``. Re-run this on every `updatePreview()` call's iframe `load` event (can share the same `load` listener used for scroll-restoration in item 2 — both need a `load` hook, so consolidate into one handler that does scroll-restore + dynamic height in one place, but only apply the height-resize part under the mobile breakpoint, checked via `window.matchMedia('(max-width: 900px)').matches`).
- Keep wide-screen iframe height as `100%` (filling the sticky/fixed container) — do not apply the dynamic content-height resize there.

## 5. Fixed app header; non-fixed footer

**Header:** Make `.app-header` `position: fixed; top: 0; left: 0; right: 0; z-index: 10` so it stays visible while the page scrolls, on all screen sizes (request doesn't scope this to wide-only). Add `padding-top` to `.layout` (or `body`) equal to the header's rendered height so fixed positioning doesn't overlap the content underneath — measure or set an explicit header height (e.g. `height: 48px` matching current padding+font metrics) so the offset is a known constant rather than guessed.

**Footer note (new, see item 6):** Must NOT be fixed. Render at the bottom of normal document flow:
- Wide screens: below the editor column (left panel), i.e. after `.layout` in the DOM, so it's beneath both panels once the left panel's content (taller than the sticky-height preview) ends.
- Small screens: naturally at the bottom of the page since everything stacks vertically already.
- This is a plain footer element outside `.layout`, requiring no special responsive CSS beyond default block flow — the "appears below the editor / at the bottom" requirement falls out naturally from DOM order once layout is no longer sticky-trapping it.

**Sticky preview height recalculation:** With a fixed header of known height `H`, change `.panel-right`'s sticky `top` from `16px` to `calc(H + 16px)` and its `height` from `calc(100vh - 32px)` to `calc(100vh - H - 32px)`, so the preview panel's visible height correctly excludes the now-fixed header rather than assuming the header scrolls away. Use a CSS custom property (e.g. `--header-height: 48px`) set once in `:root` so both the header's own height and these calc()s stay in sync from one source of truth.

## 6. Site footer note with configurable content

**Requirement:** A note at the very bottom of the page: "Created 2026-06 by Max for the AStA. License MIT (linked). Questions: maxstridde@uni-bonn.de" — phrased smoothly, and the date/name/license-link/email must be editable via Vite config rather than hardcoded in source, so a future maintainer (the AStA IT team) can update attribution without touching app logic.

**Mechanism — Vite `define` + `.env`:**
- Add to `vite.config.ts`:
  ```ts
  export default defineConfig({
    base: '/asta-mail-builder/',
    define: {
      __APP_CREATED__: JSON.stringify('June 2026'),
      __APP_AUTHOR__: JSON.stringify('Max'),
      __APP_CONTACT_EMAIL__: JSON.stringify('maxstridde@uni-bonn.de'),
      __APP_LICENSE_URL__: JSON.stringify('https://opensource.org/license/mit/'),
    },
  })
  ```
  This is the standard Vite mechanism for compile-time constants and keeps things in one obvious file, as requested ("editable in the vite config file").
- Declare the global types in a new `src/vite-env.d.ts` (or extend the existing one if present) so TypeScript knows about `__APP_CREATED__` etc.
- In `index.html`, add a `<footer class="site-footer">` after `.layout`, containing a sentence built from these constants, e.g.:
  > "Created {{__APP_CREATED__}} by {{__APP_AUTHOR__}} for the AStA. Released under the [MIT License]({{__APP_LICENSE_URL__}}). Questions? Write to {{__APP_CONTACT_EMAIL__}}."
- Since `index.html` itself isn't processed by the `define` replacement (that only applies to JS/TS module code), render this sentence from `src/main.ts` instead: add a `<p id="site-footer-note"></p>` placeholder in the HTML, and in `init()` set its `innerHTML` from a small template string built out of the four constants (with the email turned into a `mailto:` link and the license text turned into an `<a>` to the MIT license URL). This keeps the "editable in vite config" requirement honest — changing the four `define` values is the only edit needed to update the note.
- Suggested smooth wording: *"Built in June 2026 by Max for the AStA Uni Bonn. Released under the MIT License. Questions or feedback? Reach out at maxstridde@uni-bonn.de."*

**Styling:** small, muted, centered text block — `.site-footer { text-align: center; font-size: 12px; color: #777; padding: 16px; }`, consistent with the rest of the muted secondary text already used in `.md-instructions`.

## 7. Other changes needed before handing off to the AStA IT team / going to production

Things the request explicitly asked to think about. Concrete recommendations:

1. **README accuracy pass.** `README.md` is marked modified in git status already — confirm it documents: how to run (`npm install && npm run dev`), how to build/deploy (push to `main` → GitHub Actions → Pages), the new export/import-draft feature, and where to edit the footer attribution (`vite.config.ts` `define` block). IT team members landing on this repo cold should be able to follow README alone.
2. **License file.** Add a top-level `LICENSE` file with standard MIT license text (referenced by the new footer link) — currently there is none in the repo listing. Without it, the footer's "MIT License" link has nothing canonical to point to if it's meant to link to the repo's own license rather than the generic opensource.org page; recommend linking to `https://github.com/maxstridde/asta-mail-builder/blob/main/LICENSE` instead of the generic page once the file exists, since the user mentioned wanting "a link to an MIT License."
3. **Repo metadata.** `package.json` currently has no `repository`, `author`, `license`, or `description` fields. Add them — straightforward and what IT/anyone auditing the repo would expect:
   ```json
   "description": "...",
   "license": "MIT",
   "author": "Max Stridde",
   "repository": { "type": "git", "url": "https://github.com/maxstridde/asta-mail-builder" }
   ```
4. **Stray file cleanup.** Git status shows `Tool A – AStA Mail Builder Prompt.md` as deleted (D) but not yet committed — confirm this deletion is intentional and commit it (or restore it) before the clean push, since it shouldn't linger as uncommitted state.
5. **`dist/` and build hygiene.** `dist/` exists locally and is gitignored — correct, no action needed, just confirm `.gitignore` keeps covering it (already does, per the `.gitignore` contents read above).
6. **GitHub Actions secrets/permissions.** The existing `deploy.yml` uses `secrets.GITHUB_TOKEN`, which GitHub provides automatically — no manual secret setup needed by the IT team, but the repo's Settings → Pages must be set to "GitHub Actions" as the source (a one-time manual step after first push, can't be scripted) and Settings → Actions → Workflow permissions must allow "Read and write permissions" for the default `GITHUB_TOKEN` (required by `peaceiris/actions-gh-pages`). Worth a one-line note in README so whoever pushes first does this.
7. **Browser support note (optional, low effort):** the app uses no exotic APIs beyond `navigator.clipboard`, `Blob`, `localStorage`, all broadly supported in modern evergreen browsers — no polyfill work needed, just worth confirming in README that "modern browser" is the only requirement.
8. **No secrets in repo.** Confirmed nothing in `src/` or config touches credentials — the export/import-draft feature only ever serializes the same form-field state already in localStorage, no PII beyond whatever the user types into the newsletter fields themselves (which is the email content anyway, no different risk profile than the existing Copy/Export HTML feature).

## 8. Pushing to GitHub as a clean first commit

**Goal:** `https://github.com/maxstridde/asta-mail-builder` should receive this project's current state as a single, clean initial commit — not the existing local 3-commit history (`770e0c5`, `9c0a2ed`, `ec95e4c`).

**Approach (squash local history into one orphan commit), to run only after explicit go-ahead — this is a history-rewriting/force-push-adjacent operation and will be confirmed step by step rather than run silently:**

1. Implement and verify all the above changes first; commit them normally to `main` as usual (the user has separately indicated normal commits are fine to create when asked).
2. When ready to publish a clean history:
   - Create a new orphan branch: `git checkout --orphan release-clean`
   - Stage everything currently tracked: `git add -A`
   - Commit once: `git commit -m "Initial public release: AStA newsletter mail builder"`
   - This produces a single commit with the entire current working tree and no parent history.
3. Confirm the remote doesn't already exist with conflicting history: `git remote -v` (currently empty, confirmed above — no remote configured yet).
4. Add the remote: `git remote add origin https://github.com/maxstridde/asta-mail-builder.git`
5. **Before pushing**, explicitly confirm with the user: (a) that the GitHub repo `maxstridde/asta-mail-builder` already exists (empty or not) or needs creating first via `gh repo create`, and (b) that overwriting/setting `main` on the remote to this single squashed commit is intended — if the remote repo already has commits, this requires a force-push (`git push -u origin release-clean:main --force`), which is destructive to whatever is currently on the remote `main` and will only be done with explicit confirmation at that time.
6. Once confirmed, push and rename locally: rename `release-clean` to `main` if desired, or keep local `main` (with full history) untouched for the maintainer's own reference and only ever push the squashed branch to the remote's `main`.

**Decision needed from user before this step is executed:** whether the local repo's own `main` branch should also be rewritten to drop history, or whether local history is kept intact for the user's own reference while only the *pushed* remote history is squashed. Recommend the latter (keep local history, push squashed) unless the user wants both clean — this avoids any risk of losing local commit context.

## Summary of files to be touched (implementation phase, not yet started)

- `index.html` — textarea rows fix, export/import-draft buttons + hidden file input, site footer markup
- `src/style.css` — textarea sizing, header height var + fixed positioning, panel-right sticky offset recalculation, mobile preview height removal, site-footer styling
- `src/main.ts` — scroll-position preservation on `srcdoc` update, dynamic mobile iframe height, `exportDraft()`/`importDraft()` handlers, site-footer note rendering from build-time constants
- `vite.config.ts` — `define` block for attribution constants
- `src/vite-env.d.ts` (new or extended) — type declarations for the `__APP_*__` globals
- `package.json` — repository/author/license/description metadata
- `LICENSE` (new) — MIT license text
- `README.md` — usage + deploy + Pages-settings note updates
