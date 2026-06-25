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

All text fields accept **Markdown** input. Update the preview on every `input` event (debounce 200ms if performance is a concern).

| Field | Description |
|---|---|
| **Table of Contents items** | A dynamic list: start with 8 text inputs, add a "+ Add item" / "– Remove" button. Items map to `<li>` entries in both ToC boxes. |
| **DE – Introduction** | Markdown. Short intro paragraph, German. |
| **DE – Main Text** | Markdown. The bulk of the German content. |
| **EN – Introduction** | Markdown. Short intro paragraph, English. |
| **EN – Main Text** | Markdown. The bulk of the English content. |

 (collapsed):
- DE Greeting override (default: `Hallo [Sympa Name],` and `Hallo!`)
- EN Greeting override (default: `Hello [Sympa Name],` and `Hello!`)

---

## Template insertion

The AStA HTML email template is embedded as a JavaScript template literal string (copy the full HTML from `ASta Mail Template.html`). Replace the `<!-- EDIT -->` comment placeholders with the processed field values.

The template has these insertion points (by HTML comment):
- `<!-- EDIT Introduction -->` (German)
- `<!-- EDIT -->` after it (German main content)
- `<!-- EDIT ordered List / unordered List of table of contents -->` (German ToC)
- Same three slots repeated for the English section

---

## CSS post-processing (the only real logic)

After converting each Markdown field with `marked.parse()`, run a simple string transformation on the resulting HTML before inserting it into the template:

1. **Links** — add `style="color:#85152A; text-decoration:none;"` to every `<a` tag that does not already have a `style` attribute.
   ```js
   html.replace(/<a /g, '<a style="color:#85152A; text-decoration:none;" ')
   ```

2. **Ordered lists** — add `style="margin-top:0; padding-left:20px;"` to every `<ol>` tag.
   ```js
   html.replace(/<ol>/g, '<ol style="margin-top:0; padding-left:20px;">')
   ```

3. **Unordered lists** — same for `<ul>`.
   ```js
   html.replace(/<ul>/g, '<ul style="margin-top:0; padding-left:20px;">')
   ```

4. **Headings** Run the colouring on all h2/h3 headings just like the h1 heading which is already styled inline in the template itself.

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
