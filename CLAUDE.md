# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AStA Uni Bonn — Newsletter Email Builder. A single `index.html` file that lets a user write newsletter content in Markdown and produces a ready-to-copy HTML email using the AStA corporate template. No backend, no build step, no framework.

## Architecture

Everything lives in `index.html`:

- **Template literal** — the full AStA HTML email (`ASta Mail Template.html`) is embedded as a JS template literal with `<!-- EDIT -->` comment placeholders as injection points.
- **EasyMDE editors** — five instances (DE Intro, DE Body, EN Intro, EN Body; ToC uses plain inputs). All loaded from CDN.
- **`marked.parse()`** — converts each EasyMDE value to HTML, then the CSS post-processor runs before insertion.
- **CSS post-processor** — pure string transforms applied to every Markdown-rendered HTML string before it goes into the template:
  - Links: inject `style="color:#85152A; text-decoration:none;"` on every `<a` without an existing style
  - Lists (`<ol>`, `<ul>`): inject `style="margin-top:0; padding-left:20px;"`
  - Headings (h2, h3): inject the same AStA red (`#85152A`) as the h1 already has inline in the template
- **Preview** — `<iframe srcdoc="...">` updated on every EasyMDE change event, debounced 200 ms.
- **LocalStorage** — all field values persisted on every change, restored on load.

## Template insertion points

The embedded template uses HTML comments as slots:

| Comment | Content |
|---|---|
| `<!-- EDIT Introduction -->` | DE intro (first occurrence) |
| `<!-- EDIT -->` (after DE intro) | DE main body |
| `<!-- EDIT ordered List / unordered List of table of contents -->` | ToC `<li>` items (DE block) |
| Same three slots repeated | EN section |

## Key constraints

- **No framework** — vanilla JS only.
- **Single file** — all CSS, JS, and the email template are inline in `index.html`. CDN scripts loaded via `<script src>`.
- **No build step** — deployable by opening the file directly or pushing to GitHub Pages.
- **EasyMDE from CDN** — `https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js` and its CSS.
- **marked from CDN** — `https://cdn.jsdelivr.net/npm/marked/marked.min.js`.

## CDN dependencies

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
```

## Features in scope (all in one build)

- Five EasyMDE Markdown editors: DE Intro, DE Body, EN Intro, EN Body; plain input list for ToC items (dynamic add/remove, start with 8 rows)
- DE/EN greeting overrides inside a `<details>` collapsible; defaults: `Hallo [Sympa Name],` / `Hallo!` and `Hello [Sympa Name],` / `Hello!`
- Live preview iframe (debounced 200 ms)
- CSS post-processing on all Markdown output before template injection
- "Copy HTML" button at top and bottom of left panel — `navigator.clipboard.writeText()`, "Copied!" label for 1.5 s
- "Export as .html" download button (`<a download>` with a Blob URL)
- "Reset / Clear all" button with `confirm()` dialog
- LocalStorage persistence (save on every change, restore on load)
- Two-column layout; stacks vertically on screens < 900 px

## What NOT to build

- No backend, API calls, or server
- No user accounts or saved sessions
- No image upload (logo is base64-embedded in the template)
- No TypeScript, no Vite, no npm
