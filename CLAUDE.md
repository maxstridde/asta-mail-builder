# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AStA Uni Bonn — Newsletter Email Builder. A single `index.html` file that lets a user write newsletter content in Markdown and produces a ready-to-copy HTML email using the AStA corporate template. No backend, no build step, no framework.

## Deployment target

Single `index.html` file, all dependencies from CDN, deployable to GitHub Pages with no build step.

## CDN dependencies

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
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
| DE Greeting | `<input type="text">` | `Hallo [Sympa Name],` (shown when user.gecos exists) |
| DE Greeting fallback | `<input type="text">` | `Hallo!` (shown when no name) |
| EN Greeting | `<input type="text">` | `Hello [Sympa Name],` |
| EN Greeting fallback | `<input type="text">` | `Hello!` |
| DE Introduction | EasyMDE | Short German intro paragraph |
| EN Introduction | EasyMDE | Short English intro paragraph |
| DE Main Text | EasyMDE | Bulk German content |
| EN Main Text | EasyMDE | Bulk English content |
| DE ToC items | Dynamic list of `<input type="text">`, 8 initial rows | Maps to `<li>` items in DE ToC `<ol>` |
| EN ToC items | Dynamic list of `<input type="text">`, 8 initial rows | Maps to `<li>` items in EN ToC `<ol>` |

ToC lists: each has an "+ Add item" button and a "− Remove" button per row.

Greeting fields are inside a `<details>` block (collapsed by default).

## Template injection

`ASta Mail Template.html` is embedded verbatim as a JS template literal in `index.html`. The builder replaces 8 comment-delimited regions sequentially (top to bottom in the template):

| # | Start boundary | End boundary | Replace target | With |
|---|---|---|---|---|
| 1 | `<!-- EDIT optional Greeting -->` | `<!-- EDIT Introduction -->` | entire `<p>[% IF user.gecos …]</p>` DE tag | `<p>{deGreeting1}</p><p>{deGreeting2}</p>` |
| 2 | `<!-- EDIT Introduction -->` | `<!-- Introduction End -->` | `<!-- EDIT -->` inside | DE Intro HTML |
| 3 | `<!-- EDIT ordered List / unordered List of table of contents -->` | `<!-- End of List-->` (1st) | existing `<ol>…</ol>` | DE ToC `<ol><li>…</li></ol>` |
| 4 | `<!-- EDIT Main Content -->` | `<!-- Main Content End-->` (1st) | `<!-- EDIT -->` inside | DE Body HTML |
| 5 | `<!-- EDIT optional Greeting English  -->` | `<!-- EDIT Introduction  -->` | entire `<p>[% IF user.gecos …]</p>` EN tag | `<p>{enGreeting1}</p><p>{enGreeting2}</p>` |
| 6 | `<!-- EDIT Introduction  -->` | `<!-- Introduction End   -->` | `<!-- EDIT -->` inside | EN Intro HTML |
| 7 | `<!-- EDIT ordered List / unordered List of table of contents   -->` | `<!-- End of List-->` (2nd) | existing `<ol>…</ol>` | EN ToC `<ol><li>…</li></ol>` |
| 8 | `<!-- EDIT Main Content -->` | `<!-- Main Content End-->` (2nd) | `<!-- EDIT -->` inside | EN Body HTML |

Use a helper `replaceSection(html, startMarker, endMarker, newContent)` and call it 8 times sequentially. For sections 4 and 8 (both `<!-- EDIT Main Content -->` … `<!-- Main Content End-->`), the second call naturally targets the second occurrence because the first was already replaced.

## CSS post-processing

Applied to all Markdown-rendered HTML before injection. The template's `<style>` block handles these visually, but email clients strip `<style>` — inline styles are required on dynamically injected content.

```js
function postProcess(html) {
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

```js
previewIframe.srcdoc = assembledHtml;
```

Preview updates on every EasyMDE `change` event and every `input` event on plain text fields, debounced 200 ms.

## Buttons

- **Copy HTML** (top + bottom): `navigator.clipboard.writeText(assembledHtml)` → show "Copied!" for 1.5 s
- **Export .html**: create a `Blob` with `type: 'text/html'`, generate an object URL, click a hidden `<a download="asta-newsletter.html">` 
- **Reset / Clear all**: `confirm()` dialog → clear all EasyMDE instances and plain text inputs, remove localStorage

## LocalStorage

Save all field values on every change event (debounced). Key: `asta-mail-builder`. On page load, restore saved values if present and initialize EasyMDE instances with the stored content.

## AStA brand color

`#85152A` — used for links, h1–h4 headings, and template accent elements.

## What NOT to build

- No backend, API calls, or server
- No user accounts or saved sessions
- No image upload (logo is base64-embedded in the template)
- No TypeScript, no Vite, no npm
