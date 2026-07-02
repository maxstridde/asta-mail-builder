import { defineConfig } from 'vite'

// Site-footer attribution constants. The AStA IT team can update these without
// touching app logic — they are injected at build time via Vite's `define`
// and rendered by the site-footer note in src/main.ts.
const base = '/asta-mail-builder/'

export default defineConfig({
  base,
  define: {
    __APP_CREATED__: JSON.stringify('June 2026'),
    __APP_AUTHOR__: JSON.stringify('Max'),
    __APP_CONTACT_EMAIL__: JSON.stringify('maxstridde@uni-bonn.de'),
    __APP_REPO_URL__: JSON.stringify('https://github.com/maxstridde/asta-mail-builder'),
  },
})
