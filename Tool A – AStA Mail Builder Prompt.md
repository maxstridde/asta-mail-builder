# Prompt: AStA Newsletter Email Builder

## Goal

Build a minimal, single-file static web app that lets a user write newsletter content in Markdown and produces a ready-to-copy HTML email using the AStA Uni Bonn template. The tool requires no backend, no login, and no build step. It should be deployable as a single `.html` file, or as a minimal Vite project on GitHub Pages.

---

## Core philosophy

- **Minimal code.** Reuse existing libraries for everything except the template insertion logic and the CSS post-processing. Do not reinvent Markdown parsing, editor UI, or clipboard handling.
- **No framework.** Vanilla JavaScript/TypeScript only. No React, Vue, or Angular.
- **One real feature:** Take user input from several fields, apply the correct inline CSS transformations, insert the results into the AStA HTML email template, and display a live preview.

---

## Libraries to use (all available from CDN, no install needed)

| Purpose | Library | CDN |
|---|---|---|
| Markdown → HTML | `marked` v12+ | `https://cdn.jsdelivr.net/npm/marked/marked.min.js` |
| Markdown editor UI | `EasyMDE` | `https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js` + CSS |
| Copy to clipboard | Native `navigator.clipboard.writeText()` | No library needed |
| Preview | Native `<iframe srcdoc="...">` | No library needed |
| Styling the tool UI | Simple hand-written CSS, two-column layout | No framework needed |

Use EasyMDE for all Markdown text areas — it provides a toolbar and live formatting preview that makes the tool accessible to non-technical users. EasyMDE is available via CDN so no build step is needed. Keep the deployment target as a **single `index.html`** file (no Vite).

---

## Layout

Two-column layout, side by side:

```
┌─────────────────────────┬──────────────────────────┐
│  [Copy HTML button]     │                          │
│  LEFT: Input fields     │  RIGHT: Live preview     │
│                         │  (iframe, scrollable)    │
│  [Field 1]              │
│  [Field 2]              │  ┌────────────────────┐  │
│  ...                    │  │  Rendered email    │  │
│  [Copy HTML button]     │  │  (updates live)    │  │
│                         │  └────────────────────┘  │
└─────────────────────────┴──────────────────────────┘
```

On narrow screens (< 900px), stack the columns vertically.

---

## Input fields (left panel)

All text fields accept **Markdown** input via EasyMDE. Update the preview on every EasyMDE `change` event, debounced 200ms.

**Design rule: always pair DE and EN fields for the same content type together.** Each section label appears once, with DE above EN. This means the left panel is divided into these grouped sections (top to bottom):

1. **Greeting** — collapsed `<details>` block
   - DE greeting text (plain text input, default: `Hallo [Sympa Name],` / `Hallo!`)
   - EN greeting text (plain text input, default: `Hello [Sympa Name],` / `Hello!`)

2. **Introduction** — paired section
   - DE Introduction (EasyMDE, short intro paragraph, German)
   - EN Introduction (EasyMDE, short intro paragraph, English)

3. **Main Text** — paired section
   - DE Main Text (EasyMDE, bulk German content)
   - EN Main Text (EasyMDE, bulk English content)

4. **Table of Contents** — paired section
   - DE ToC items: dynamic list of plain text inputs, start with 8 rows, "+ Add" / "− Remove" button; maps to `<li>` entries in the German ToC `<ol>`
   - EN ToC items: same structure, separate inputs for English translations; maps to `<li>` entries in the English ToC `<ol>`

---

## Template insertion

The AStA HTML email template (`ASta Mail Template.html`) is embedded as a JavaScript template literal string in `index.html`. Content is injected by replacing the comment-delimited sections below.

There are **8 injection points** in order of appearance in the template:

| # | Unique boundary comment(s) | What gets replaced | Source field |
|---|---|---|---|
| 1 | `<!-- EDIT optional Greeting -->` … `<!-- EDIT Introduction -->` | The entire `<p>[% IF user.gecos -%] Hallo … [%~ END -%]</p>` tag | DE Greeting (plain text) |
| 2 | `<!-- EDIT Introduction -->` … `<!-- Introduction End -->` | The `<!-- EDIT -->` placeholder inside | DE Introduction (Markdown) |
| 3 | `<!-- EDIT ordered List / unordered List of table of contents -->` … `<!-- End of List-->` (1st occurrence) | The existing `<ol>…</ol>` | DE ToC items → `<ol><li>…</li></ol>` |
| 4 | `<!-- EDIT Main Content -->` … `<!-- Main Content End-->` (1st occurrence) | The `<!-- EDIT -->` placeholder inside | DE Main Text (Markdown) |
| 5 | `<!-- EDIT optional Greeting English  -->` … `<!-- EDIT Introduction  -->` | The entire `<p>[% IF user.gecos -%] Hello … [%~ END -%]</p>` tag | EN Greeting (plain text) |
| 6 | `<!-- EDIT Introduction  -->` … `<!-- Introduction End   -->` | The `<!-- EDIT -->` placeholder inside | EN Introduction (Markdown) |
| 7 | `<!-- EDIT ordered List / unordered List of table of contents   -->` … `<!-- End of List-->` (2nd occurrence) | The existing `<ol>…</ol>` | EN ToC items → `<ol><li>…</li></ol>` |
| 8 | `<!-- EDIT Main Content -->` … `<!-- Main Content End-->` (2nd occurrence) | The `<!-- EDIT -->` placeholder inside | EN Main Text (Markdown) |

**Implementation note:** Use a helper `replaceSection(html, startComment, endComment, newContent)` that finds the first (or nth) occurrence of the region between `startComment` and `endComment` and replaces its inner content. Process all 8 replacements sequentially on the template string, top to bottom.

---

## CSS post-processing (the only real logic)

After converting each Markdown field with `marked.parse()`, run these string transformations on the resulting HTML before inserting it into the template. The template's `<style>` block already handles these visually, but email clients strip `<style>` blocks, so inline styles are required on dynamically injected content.

1. **Links** — add `style="color:#85152A; text-decoration:none;"` to every `<a` tag.
   ```js
   html.replace(/<a /g, '<a style="color:#85152A; text-decoration:none;" ')
   ```

2. **Ordered lists**
   ```js
   html.replace(/<ol>/g, '<ol style="margin-top:0; padding-left:20px;">')
   ```

3. **Unordered lists**
   ```js
   html.replace(/<ul>/g, '<ul style="margin-top:0; padding-left:20px;">')
   ```

4. **h2 headings**
   ```js
   html.replace(/<h2>/g, '<h2 style="font-size:24px; color:#85152A; margin-bottom:5px;">')
   ```

5. **h3 headings**
   ```js
   html.replace(/<h3>/g, '<h3 style="font-size:18px; color:#85152A; margin-bottom:5px;">')
   ```

The h1 and h4 headings in the template already carry inline `style` attributes and are not dynamically injected, so they need no post-processing.

---

## "Copy HTML" button

A single button at the top and bottom of the left panel:
```js
navigator.clipboard.writeText(currentHtml);
```
Show a brief "Copied!" confirmation (e.g. change the button label for 1.5 seconds).

---

## Live preview

Use an `<iframe>` with the `srcdoc` attribute set to the assembled HTML string. Update it on every field input event.

```js
previewIframe.srcdoc = assembledHtml;
```

The iframe should be tall enough to show the full email (set `height: 100vh` or a large fixed height, with `overflow-y: auto`).

---

## Features list

All features are in scope for the single build. There is no v1/v2 split.

- [ ] Five Markdown editors (EasyMDE): DE Intro, DE Body, EN Intro, EN Body, plus ToC items
- [ ] Live preview iframe that updates as the user types
- [ ] Debounced preview update (200ms)
- [ ] CSS post-processing: auto-inject inline color on links, spacing on lists, color on h2/h3 headings
- [ ] "Copy HTML" button (top and bottom of left panel) that copies the full assembled email HTML
- [ ] "Copied!" feedback on the copy button (1.5 s label change)
- [ ] "Export as .html" download button in addition to copy
- [ ] "Reset / Clear all" button with confirmation dialog
- [ ] ToC item list: dynamic add/remove rows (start with 8)
- [ ] DE/EN greeting overrides (collapsed in a `<details>` block), defaults: `Hallo [Sympa Name],` / `Hallo!` and `Hello [Sympa Name],` / `Hello!`
- [ ] LocalStorage persistence so content survives a page refresh
- [ ] Two-column layout (input left, preview right)
- [ ] Responsive: stack vertically on screens < 900 px
- [ ] The AStA email template embedded as a JS template literal

---

## Deployment

Target: GitHub Pages, hosted from a single `index.html` file (no build step, no Vite). All libraries loaded from CDN. Deploy by pushing the file to `main` or placing it in a `/docs` folder.

---

## What NOT to build

- No backend, no API calls, no server
- No user accounts or saved sessions
- No support for image uploads — the logo is already embedded in the template as base64

---

## Starting point hint

The simplest valid implementation is a single `index.html` file:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
  <!-- Two-column layout, textareas left, iframe right -->
  <!-- All logic in a <script> tag at the bottom -->
</body>
</html>
```

Paste the AStA template HTML as a JS template literal, swap in the processed Markdown for each `<!-- EDIT -->` slot, set `iframe.srcdoc = result` on every input event.
