/// <reference types="vite/client" />

declare module '*.html?raw' {
  const content: string
  export default content
}

// Build-time attribution constants, injected via the `define` block in
// vite.config.ts. Edit the values there to update the site-footer note.
declare const __APP_CREATED__: string
declare const __APP_AUTHOR__: string
declare const __APP_CONTACT_EMAIL__: string
declare const __APP_REPO_URL__: string
