# AStA Mail Builder

A small browser-based tool for writing AStA Uni Bonn newsletter content in Markdown and exporting it as a ready-to-send HTML email in the AStA corporate template. No backend, no accounts — everything runs client-side and is saved to `localStorage`.

Live app: deployed automatically to GitHub Pages on every push to `main`.

## Usage

1. Fill in the German and English content side by side, section by section: Greeting (incl. title), Introduction, Table of Contents, Main Text, Final Greeting, and Footer. Markdown is supported in the rich-text fields.
2. Watch the live preview on the right update as you type.
3. Click **Copy HTML** to copy the assembled email to the clipboard, or **Export .html** to download it as a file.
4. Paste the result into Sympa (or any mailing tool) as the message body.

The greeting fields keep the real Sympa personalization logic intact — `[% IF user.gecos %] … [% ELSE %] … [% END %]` — so each recipient still gets their own name (or the fallback greeting) at send time. Only the wording around the name placeholder is editable, not the conditional itself.

Use the **English: On/Off** toggle to include or drop the English half of the newsletter (and its divider bar) from the output entirely — toggling back on restores any English content you'd already typed.

Your edits are auto-saved to the browser's `localStorage`, but that never leaves your machine. To back up a draft or hand it to someone else, use **Export Draft** to download a `asta-newsletter-draft.json` file, and **Import Draft** to load one back in later. (This is independent of the HTML export — a draft is the editable source, the HTML is the finished email.)

Markdown editors only support **H2 (`##`)** and **H3 (`###`)** headings — H1 is reserved for the newsletter title. Typing an H1 or H4+ heading outlines that editor yellow as a warning. The `image` and `check-list` toolbar buttons are intentionally disabled (no image uploads, not useful for email markdown); re-enable either by editing `EDITOR_TOOLBAR_OPTIONS` in `src/main.ts`.

Use **Reset / Clear all** to wipe saved content and start over.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

Any modern evergreen browser is sufficient — the app relies only on standard `navigator.clipboard`, `Blob`, and `localStorage` APIs, with no polyfills required.

## Deployment

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which builds `dist/` and publishes it to GitHub Pages.

First-time setup on the repo (one-time, manual — can't be scripted):

1. **Settings → Pages** → set **Source** to **GitHub Actions** (or to the `gh-pages` branch the workflow publishes, depending on Pages mode).
2. **Settings → Actions → General → Workflow permissions** → enable **Read and write permissions** so the default `GITHUB_TOKEN` can publish (required by `peaceiris/actions-gh-pages`). No additional secrets are needed.

## Configuration

The attribution note at the bottom of the page (creation date, author, license link, contact email) is **not** hardcoded in source. Edit the four `define` constants in `vite.config.ts` — `__APP_CREATED__`, `__APP_AUTHOR__`, `__APP_CONTACT_EMAIL__`, `__APP_LICENSE_URL__` — to update it; no app logic changes required.

## Stack

Vite + TypeScript, [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) for the Markdown editors, and [marked](https://github.com/markedjs/marked) for Markdown → HTML rendering. See `CLAUDE.md` for the full architecture and template-injection details.

Licensed under the [MIT License](LICENSE).
