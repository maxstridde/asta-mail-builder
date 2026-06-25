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

Two-column layout: left panel = all inputs, right panel = live preview iframe. Stack vertically on screens < 900 px.

**Left panel structure (top to bottom):**
- Copy HTML + Export buttons (top)
- Greeting section — wrapped in a `<details>` / `<summary>` collapsible element
- Introduction section (DE + EN paired)
- Main Text section (DE + EN paired)
- Table of Contents section (DE + EN paired)
- Copy HTML + Export buttons (bottom)
- Reset / Clear all button

**Pairing rule:** DE and EN fields for the same content type are always grouped together in the same visual section, DE above EN, with a clear DE/EN label on each.

## Input fields

| Field | Widget | Default / notes |
|---|---|---|
| DE Greeting | `<input type="text">` | `Hallo [Sympa Name],` — named-recipient branch (shown when `user.gecos` exists) |
| DE Greeting fallback | `<input type="text">` | `Hallo!` — fallback branch (shown when no name) |
| EN Greeting | `<input type="text">` | `Hello [Sympa Name],` |
| EN Greeting fallback | `<input type="text">` | `Hello!` |
| DE Introduction | EasyMDE | Empty (blank in template) |
| EN Introduction | EasyMDE | Empty (blank in template) |
| DE Main Text | EasyMDE | Empty (blank in template) |
| EN Main Text | EasyMDE | Empty (blank in template) |
| DE ToC items | Dynamic list of `<input type="text">`, 8 initial rows | Pre-filled: "item 1" … "item 8" (matching template defaults) |
| EN ToC items | Dynamic list of `<input type="text">`, 8 initial rows | Pre-filled: "item 1" … "item 8" (matching template defaults) |

ToC lists: each has an "+ Add item" button and a "− Remove" button per row.

Greeting fields are inside a `<details>` block (collapsed by default).

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

`src/template.html` is imported as a raw string via `import templateHtml from './template.html?raw'`. The builder replaces 8 comment-delimited regions sequentially (top to bottom in the template):

| # | Start boundary | End boundary | Replace target | With |
|---|---|---|---|---|
| 1 | `<!-- EDIT optional Greeting -->` | `<!-- EDIT Introduction -->` | entire `<p>[% IF user.gecos …]</p>` DE tag | `buildGreeting(deGreeting1, deGreeting2)` — rebuilt Sympa conditional |
| 2 | `<!-- EDIT Introduction -->` | `<!-- Introduction End -->` | `<!-- EDIT -->` inside | DE Intro HTML |
| 3 | `<!-- EDIT ordered List / unordered List of table of contents -->` | `<!-- End of List-->` (1st) | existing `<ol>…</ol>` | DE ToC `<ol><li>…</li></ol>` |
| 4 | `<!-- EDIT Main Content -->` | `<!-- Main Content End-->` (1st) | `<!-- EDIT -->` inside | DE Body HTML |
| 5 | `<!-- EDIT optional Greeting English  -->` | `<!-- EDIT Introduction  -->` | entire `<p>[% IF user.gecos …]</p>` EN tag | `buildGreeting(enGreeting1, enGreeting2)` — rebuilt Sympa conditional |
| 6 | `<!-- EDIT Introduction  -->` | `<!-- Introduction End   -->` | `<!-- EDIT -->` inside | EN Intro HTML |
| 7 | `<!-- EDIT ordered List / unordered List of table of contents   -->` | `<!-- End of List-->` (2nd) | existing `<ol>…</ol>` | EN ToC `<ol><li>…</li></ol>` |
| 8 | `<!-- EDIT Main Content -->` | `<!-- Main Content End-->` (2nd) | `<!-- EDIT -->` inside | EN Body HTML |

Use a helper `replaceSection(html: string, startMarker: string, endMarker: string, newContent: string): string` and call it 8 times sequentially. For sections 4 and 8 (both `<!-- EDIT Main Content -->` … `<!-- Main Content End-->`), the second call naturally targets the second occurrence because the first was already replaced.

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

## Buttons

- **Copy HTML** (top + bottom): `navigator.clipboard.writeText(assembledHtml)` → show "Copied!" for 1.5 s
- **Export .html**: create a `Blob` with `type: 'text/html'`, generate an object URL, click a hidden `<a download="asta-newsletter.html">`
- **Reset / Clear all**: `confirm()` dialog → clear all EasyMDE instances and plain text inputs, reset ToC rows to 8 × "item 1"…"item 8", remove localStorage

## LocalStorage

Save all field values on every change event (debounced). Key: `asta-mail-builder`. On page load, restore saved values if present and initialize EasyMDE instances with the stored content. If no saved state, initialize with defaults (empty editors, 8 pre-filled ToC rows).

## AStA brand color

`#85152A` — used for links, h1–h4 headings, and template accent elements.

## What NOT to build

- No backend, API calls, or server
- No user accounts or saved sessions
- No image upload (logo is base64-embedded in the template)
- No React, Vue, or Angular — vanilla TypeScript only
