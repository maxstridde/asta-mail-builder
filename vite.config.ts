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
    // Points at the published copy in public/LICENSE.txt (served at <base>LICENSE.txt),
    // derived from `base` so it stays correct if the deploy path changes.
    __APP_LICENSE_URL__: JSON.stringify(base + 'LICENSE.txt'),
  },
})
