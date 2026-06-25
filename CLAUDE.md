# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AStA Uni Bonn — Newsletter Email Builder. A Vite + TypeScript app that lets a user write newsletter content in Markdown and produces a ready-to-copy HTML email using the AStA corporate template. No backend, no framework.

Status: feature-complete and shipping. See `README.md` for user-facing usage instructions.

## Deployment target

GitHub Pages, deployed automatically via GitHub Actions on every push to `main`. Build output is `dist/`. Repo: `https://github.com/maxstridde/asta-mail-builder`.

## Project structure

```
asta-mail-builder/
├── index.html                   # Vite entry point
├── src/
│   ├── main.ts                  # all app logic
│   ├── style.css                # builder UI styles
│   └── template.html            # the AStA email template (imported as ?raw)
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml
```

## npm dependencies

```json
{
  "dependencies": {
    "easymde": "latest",
    "marked": "^12.0.0"
  },
  "devDependencies": {
    "vite": "latest",
    "typescript": "latest"
  }
}
```

Import in `src/main.ts`:
```ts
import EasyMDE from 'easymde'
import { marked } from 'marked'
import 'easymde/dist/easymde.min.css'
import templateHtml from './template.html?raw'
```

## Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
export default defineConfig({
  base: '/asta-mail-builder/',
})
```

## GitHub Actions workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Page layout

Two-column layout: left panel = all inputs, right panel = live preview iframe. Stack vertically on screens < 900 px (the mobile layout sets `align-items: stretch` on `.layout` so panels fill the full width instead of shrinking to content width).

The `.app-header` is `position: fixed` (full width, `z-index: 10`) on all screen sizes; its height comes from the `--header-height` CSS variable (`:root`, currently `48px`), which is the single source of truth feeding both the `.layout` top padding offset and the `.panel-right` sticky `top` / `height` calc()s — change the variable in one place and the header, content offset, and preview height stay in sync. A muted `.site-footer` note sits at the bottom of normal document flow (after `.layout`, not fixed) — see "Site footer note" below.

On wide screens (≥ 900 px) the preview is `position: sticky` and fills the viewport below the fixed header with its own scrollbar. On narrow screens the preview rejoins normal page flow (`position: static; height: auto`) and `updatePreview()` sizes the iframe to its full content height (via the iframe `load` handler, gated on `MOBILE_QUERY.matches`) so the whole email is visible inline with no nested scrollbar.

**Left panel structure (top to bottom):**
- Copy HTML + Export + Reset/Clear-all buttons (top)
- Markdown instructions block (static, no inputs — H2/H3-only rule, link syntax)
- English on/off toggle button + Export Draft + Import Draft buttons (one `.button-row`), plus a hidden `<input type="file">` and a transient `#draft-feedback` message line
- Greeting section (DE/EN Title, English notice, DE/EN Greeting) — wrapped in a `<details>` / `<summary>` collapsible element, collapsed by default
- Introduction section (DE + EN paired)
- Table of Contents section (DE + EN paired, incl. editable ToC title)
- Main Text section (DE + EN paired)
- Final Greeting section (DE + EN paired) — `<details>`, collapsed by default
- Footer section (not language-paired — template renders the footer once) — `<details>`, collapsed by default
- Copy HTML + Export buttons (bottom)
- Reset / Clear all button (bottom)

**Pairing rule:** DE and EN fields for the same content type are always grouped together in the same visual section, DE above EN, with a `DE — <Section>` / `EN — <Section>` label on each (e.g. `DE — Introduction`). Every EN-side element carries the `english-only` class so the toggle can show/hide it in one pass.

## Input fields

| Field | Widget | Default / notes |
|---|---|---|
| DE/EN Title | `<input type="text">` | `Neuigkeiten vom AStA` / `News from the AStA` — the `<h1>` text |
| English notice | `<input type="text">` | `english version below` — shown above the German title, only when English is enabled |
| DE Greeting | `<input type="text">` | `Hallo [Sympa Name],` — named-recipient branch (shown when `user.gecos` exists) |
| DE Greeting fallback | `<input type="text">` | `Hallo!` — fallback branch (shown when no name) |
| EN Greeting | `<input type="text">` | `Hello [Sympa Name],` |
| EN Greeting fallback | `<input type="text">` | `Hello!` |
| DE Introduction | EasyMDE | Defaults to the "find out more on asta-bonn.de / Instagram" blurb as editable Markdown |
| EN Introduction | EasyMDE | English equivalent of the above |
| DE/EN ToC title | `<input type="text">` | `Themen dieser Ausgabe` / `Topics of this issue` — the ToC box `<h4>` |
| DE ToC items | Dynamic list of `<input type="text">`, 3 initial rows | Pre-filled: "item 1" … "item 3" |
| EN ToC items | Dynamic list of `<input type="text">`, 3 initial rows | Pre-filled: "item 1" … "item 3" |
| DE Main Text | EasyMDE | Empty (blank in template) |
| EN Main Text | EasyMDE | Empty (blank in template) |
| DE/EN Final Greeting (2 lines each) | `<input type="text">` × 2 per language | `Mit besten Grüßen` / `euer AStA-Öffentlichkeitsreferat`, `Best Wishes` / `your AStA-Öffentlichkeitsreferat` — plain text, no `<strong>` wrapper |
| Footer address | `<textarea rows="3">` | `AStA Universität Bonn\nEndenicher Allee 19 (Container), 53115 Bonn` — plain text; `\n` is converted to `<br>` at assembly, not run through Markdown. Styled (`.lang-pair textarea`) to match text inputs with `resize: vertical` and `font-family: inherit` |
| Footer email text/href | `<input type="text">` × 2 | text `oeff@asta.uni-bonn.de`, href `mailto:oeff@asta.uni-bonn.de` |
| Footer mailing-list text/href | `<input type="text">` × 2 | text `Link zu Mailinglisten-Homepage`, href `https://listen.uni-bonn.de/wws/info/asta-newsletter` |
| Footer unsubscribe lead text / link text / link href | `<input type="text">` × 3 | `Zum Abmelden sende eine leere Mail an`, `asta-newsletter-unsubscribe@listen.uni-bonn.de`, `mailto:asta-newsletter-unsubscribe@listen.uni-bonn.de` |
| English on/off toggle | `<button id="toggle-english">` | Defaults to on; toggling off hides `.english-only` elements and drops the English block (and divider) from assembled output without clearing the underlying field values |

ToC lists: each has an "+ Add item" button and a "− Remove" button per row.

EasyMDE editors use a restricted toolbar (`EDITOR_TOOLBAR_OPTIONS` in `src/main.ts`) that omits the `image` and `check-list` buttons — reversible by adding the name back into that array. Each of the 4 editors also runs a debounced (700 ms) per-editor heading check (also run once on initial load, after import, and after reset): an H1 (`#`) or H4–H6 (`####`–`######`) anywhere in the content outlines that editor's CodeMirror box yellow via the `heading-warning` class, since only H2/H3 are valid in the email body (H1 is reserved for the title). When a box is flagged, a yellow `.heading-warning-hint` paragraph (created lazily per editor, kept in a `WeakMap`, toggled via `hidden`) appears directly below it explaining the rule. The set of currently-flagged editors is tracked in `editorsWithWarning`; whenever it's non-empty, all four Copy HTML / Export `.html` buttons get the `has-warning` class (yellow), and clicking any of them first runs `confirmIfHeadingWarning()` — a `confirm()` the user can dismiss to proceed anyway (the warning is advisory; copy/export still work).

## Greeting logic (Sympa)

The template's greeting paragraph is real Sympa templating syntax, e.g. (German):

```
<p>[% IF user.gecos -%] Hallo [% user.gecos %], [%~ ELSE -%] Hallo![%~ END -%]</p>
```

This conditional must survive into the assembled output unchanged — Sympa evaluates it per-recipient at send time, substituting the subscriber's real name for `user.gecos`. The builder must NOT flatten it into static always-shown text.

`buildGreeting(named, fallback)` in `src/main.ts` rebuilds this conditional from the two editable fields:
- `named` (e.g. `Hallo [Sympa Name],`) — the literal placeholder text `[Sympa Name]` is swapped for the real tag `[% user.gecos %]`, so the comma stays immediately after the name token, matching the original template's structure.
- `fallback` (e.g. `Hallo!`) — used verbatim as the `ELSE` branch.

Result: `<p>[% IF user.gecos -%] Hallo [% user.gecos %], [%~ ELSE -%] Hallo![%~ END -%]</p>` — same structure for English, with `Hello`/`Hello!`.

## Template injection

`src/template.html` is imported as a raw string via `import templateHtml from './template.html?raw'`. `assembleHtml()` in `src/main.ts`:

1. If English is disabled, strips two regions outright via a plain indexOf/slice (`stripRegion()`), before any other replacement runs:
   - `<!-- EDIT EnglishNotice -->` … `<!-- EnglishNotice End -->`
   - `<!-- ENGLISH BLOCK START -->` … `<!-- ENGLISH BLOCK END -->` (wraps the divider bar + the entire English content section, h1 through final greeting)

   If English is enabled, the EnglishNotice region instead goes through the normal `replaceSection` call below, and every English-only `replaceSection` call runs.

2. Calls `replaceSection(html, startMarker, endMarker, newContent)` once per comment-delimited region, in document order: Title (DE), Greeting (DE), Introduction (DE), ToC title (DE), ToC list (DE), Main Content (DE), Final Greeting 1/2 (DE), then — only when English is enabled — Title (EN), Greeting (EN), Introduction (EN), ToC title (EN), ToC list (EN), Main Content (EN), Final Greeting 1/2 (EN), then the footer fields (address, email text, mailing-list text, unsubscribe text, unsubscribe link text). `replaceSection` finds the literal `<!-- EDIT -->` placeholder (or the existing `<ol>…</ol>` / `<p>[%…]</p>` patterns for ToC lists and greetings) between the two named markers and substitutes it.

3. Calls `replaceToken(html, token, value)` for the three href attributes that can't carry an HTML comment (attribute values aren't valid comment positions): `{{FOOTER_EMAIL_HREF}}`, `{{FOOTER_MAILINGLIST_HREF}}`, `{{FOOTER_UNSUBSCRIBE_HREF}}`. `replaceToken` does a plain `.replace()` since each token string is unique in the template.

Marker naming follows one convention throughout: `<!-- EDIT <Name> -->` … `<!-- EDIT -->` (the actual placeholder) … `<!-- <Name> End -->`. EN-side markers get a distinct name (e.g. `TitleEN`, `TocTitleEN`, `FinalGreetingEN1`) rather than reusing the DE name with trailing whitespace, except for the two markers inherited from the original template (`EDIT optional Greeting English  ` / `EDIT Introduction  `, which do rely on trailing-space disambiguation — don't "clean up" that whitespace, it's load-bearing for `indexOf`).

## CSS post-processing

Applied to all Markdown-rendered HTML before injection. The template's `<style>` block handles these visually, but email clients strip `<style>` — inline styles are required on dynamically injected content.

```ts
function postProcess(html: string): string {
  return html
    .replace(/<a /g, '<a style="color:#85152A; text-decoration:none;" ')
    .replace(/<ol>/g, '<ol style="margin-top:0; padding-left:20px;">')
    .replace(/<ul>/g, '<ul style="margin-top:0; padding-left:20px;">')
    .replace(/<h2>/g, '<h2 style="font-size:24px; color:#85152A; margin-bottom:5px;">')
    .replace(/<h3>/g, '<h3 style="font-size:18px; color:#85152A; margin-bottom:5px;">');
}
```

The template's h1 (`color:#85152A; font-size:26px`) and h4 (`color:#85152A; font-size:18px`) elements already carry inline styles and are static in the template — no post-processing needed for them.

## Live preview

```ts
previewIframe.srcdoc = assembledHtml;
```

Preview updates on every EasyMDE `change` event and every `input` event on plain text fields, debounced 200 ms.

Reassigning `srcdoc` rebuilds the whole iframe document and resets its scroll to 0, so `updatePreview()` captures `contentWindow.scrollX/Y` before the swap and restores it via a one-time `load` handler afterwards. Only one such handler is ever attached at a time (`pendingPreviewLoad` is removed before the next is added, and `{ once: true }` self-cleans) to avoid listener buildup across frequent updates. The same `load` handler also does the mobile dynamic-height resize (above), and `MOBILE_QUERY`'s `change` event re-runs `updatePreview()` when crossing the 900 px breakpoint.

## Buttons

- **Copy HTML** (top + bottom): `navigator.clipboard.writeText(assembledHtml)` → show "Copied!" for 1.5 s
- **Export .html**: create a `Blob` with `type: 'text/html'`, generate an object URL, click a hidden `<a download="asta-newsletter.html">`
- **Export Draft** (`export-draft`): serialize `collectState()` to pretty JSON, download as `asta-newsletter-draft.json` (`application/json`). This is the same state shape localStorage uses, exposed as a portable file for backup/sharing — called a "draft" to distinguish it from `template.html`.
- **Import Draft** (`import-draft`): clicks a hidden `<input type="file" accept="application/json">`; on change, `JSON.parse` the file and `applyState({ ...defaultState(), ...parsed })` (merge-with-defaults safety net), then `updatePreview()`. Parse failures show a transient error in `#draft-feedback` instead of throwing.
- **Reset / Clear all** (`reset-all-top` and `reset-all`, both wired to the same handler): `confirm()` dialog → clear all EasyMDE instances and plain text inputs, reset ToC rows to `TOC_DEFAULT_COUNT` (3) × "item 1"…"item 3", remove localStorage
- **English: On/Off** (`toggle-english`): flips `englishEnabled`, toggles `display` on every `.english-only` element, updates its own label, triggers a preview update. Does not clear English field values when turned off.

## Site footer note

A muted `.site-footer` at the bottom of the page (`#site-footer-note`) shows an attribution sentence built in `renderSiteFooterNote()` from four build-time constants injected via Vite's `define` block in `vite.config.ts`: `__APP_CREATED__`, `__APP_AUTHOR__`, `__APP_CONTACT_EMAIL__`, `__APP_LICENSE_URL__` (typed in `src/vite-env.d.ts`). The email becomes a `mailto:` link and the license text an `<a>` to `__APP_LICENSE_URL__`. To update attribution, edit only those four values in `vite.config.ts` — no app-logic change. `index.html` itself is not run through `define`, which is why the note is rendered from `main.ts` rather than templated into the HTML.

## LocalStorage

Save all field values (including `englishEnabled`) on every change event (debounced). Key: `asta-mail-builder`. On page load, restore saved values if present and initialize EasyMDE instances with the stored content. If no saved state, initialize with defaults (empty Main Text editors, prefilled Introduction default text, 3 pre-filled ToC rows per language, English enabled).

## AStA brand color

`#85152A` — used for links, h1–h4 headings, and template accent elements.

## What NOT to build

- No backend, API calls, or server
- No user accounts or saved sessions
- No image upload (logo is base64-embedded in the template)
- No React, Vue, or Angular — vanilla TypeScript only
