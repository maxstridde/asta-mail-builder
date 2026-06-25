# AStA Mail Builder

A small browser-based tool for writing AStA Uni Bonn newsletter content in Markdown and exporting it as a ready-to-send HTML email in the AStA corporate template. No backend, no accounts — everything runs client-side and is saved to `localStorage`.

Live app: deployed automatically to GitHub Pages on every push to `main`.

## Usage

1. Fill in the German and English content side by side: optional greeting override, introduction, table of contents, and main text. Markdown is supported in the rich-text fields.
2. Watch the live preview on the right update as you type.
3. Click **Copy HTML** to copy the assembled email to the clipboard, or **Export .html** to download it as a file.
4. Paste the result into Sympa (or any mailing tool) as the message body.

The greeting fields keep the real Sympa personalization logic intact — `[% IF user.gecos %] … [% ELSE %] … [% END %]` — so each recipient still gets their own name (or the fallback greeting) at send time. Only the wording around the name placeholder is editable, not the conditional itself.

Use **Reset / Clear all** to wipe saved content and start over.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Stack

Vite + TypeScript, [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) for the Markdown editors, and [marked](https://github.com/markedjs/marked) for Markdown → HTML rendering. See `CLAUDE.md` for the full architecture and template-injection details.
