import EasyMDE from 'easymde'
import { marked } from 'marked'
import 'easymde/dist/easymde.min.css'
import templateHtml from './template.html?raw'
import './style.css'

const STORAGE_KEY = 'asta-mail-builder'
const TOC_DEFAULT_COUNT = 3

// Buttons intentionally excluded from the editor toolbar: 'image' (no image
// uploads in this tool — the logo is template-baked) and 'check-list' (not
// useful in email markdown). To restore either for a future version, add the
// name back into this array — see EasyMDE's toolbarBuiltInButtons for the
// full default order this list is based on.
const EDITOR_TOOLBAR_OPTIONS = [
  'bold', 'italic', 'strikethrough', 'heading', '|',
  'quote', 'unordered-list', 'ordered-list', '|',
  'link', '|',
  'preview', 'side-by-side', 'fullscreen', '|',
  'guide',
] as const

interface PersistedState {
  deTitle: string
  enTitle: string
  englishNotice: string
  deGreeting1: string
  deGreeting2: string
  enGreeting1: string
  enGreeting2: string
  deIntro: string
  enIntro: string
  deTocTitle: string
  enTocTitle: string
  deToc: string[]
  enToc: string[]
  deMain: string
  enMain: string
  deFinalGreeting1: string
  deFinalGreeting2: string
  enFinalGreeting1: string
  enFinalGreeting2: string
  footerAddress: string
  footerEmailText: string
  footerEmailHref: string
  footerMailinglistText: string
  footerMailinglistHref: string
  footerUnsubscribeText: string
  footerUnsubscribeLinkText: string
  footerUnsubscribeLinkHref: string
  englishEnabled: boolean
}

function defaultState(): PersistedState {
  const toc = () => Array.from({ length: TOC_DEFAULT_COUNT }, (_, i) => `item ${i + 1}`)
  return {
    deTitle: 'Neuigkeiten vom AStA',
    enTitle: 'News from the AStA',
    englishNotice: 'english version below',
    deGreeting1: 'Hallo [Sympa Name],',
    deGreeting2: 'Hallo!',
    enGreeting1: 'Hello [Sympa Name],',
    enGreeting2: 'Hello!',
    deIntro:
      'Mehr Infos findest du auch auf unserer Website [asta-bonn.de](https://asta-bonn.de/de) oder auf unserem Instagram-Account [@asta_bonn](https://www.instagram.com/asta_bonn/).',
    enIntro:
      'Find out more on [asta-bonn.de](https://asta-bonn.de/de) or follow our Instagram [@asta_bonn](https://www.instagram.com/asta_bonn/).',
    deTocTitle: 'Themen dieser Ausgabe',
    enTocTitle: 'Topics of this issue',
    deToc: toc(),
    enToc: toc(),
    deMain: '',
    enMain: '',
    deFinalGreeting1: 'Mit besten Grüßen',
    deFinalGreeting2: 'euer AStA-Öffentlichkeitsreferat',
    enFinalGreeting1: 'Best Wishes',
    enFinalGreeting2: 'your AStA-Öffentlichkeitsreferat',
    footerAddress: 'AStA Universität Bonn\nEndenicher Allee 19 (Container), 53115 Bonn',
    footerEmailText: 'oeff@asta.uni-bonn.de',
    footerEmailHref: 'mailto:oeff@asta.uni-bonn.de',
    footerMailinglistText: 'Link zu Mailinglisten-Homepage',
    footerMailinglistHref: 'https://listen.uni-bonn.de/wws/info/asta-newsletter',
    footerUnsubscribeText: 'Zum Abmelden sende eine leere Mail an',
    footerUnsubscribeLinkText: 'asta-newsletter-unsubscribe@listen.uni-bonn.de',
    footerUnsubscribeLinkHref: 'mailto:asta-newsletter-unsubscribe@listen.uni-bonn.de',
    englishEnabled: true,
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function replaceSection(
  html: string,
  startMarker: string,
  endMarker: string,
  newContent: string
): string {
  let searchFrom = 0
  while (true) {
    const startIdx = html.indexOf(startMarker, searchFrom)
    if (startIdx === -1) {
      throw new Error(`Template marker not found: ${startMarker}`)
    }
    const contentStart = startIdx + startMarker.length
    const endIdx = html.indexOf(endMarker, contentStart)
    if (endIdx === -1) {
      throw new Error(`Template marker not found: ${endMarker}`)
    }
    const region = html.slice(contentStart, endIdx)

    if (region.includes('<!-- EDIT -->')) {
      const updated = region.replace('<!-- EDIT -->', newContent)
      return html.slice(0, contentStart) + updated + html.slice(endIdx)
    }
    if (/<ol[^>]*>[\s\S]*<\/ol>/.test(region)) {
      const updated = region.replace(/<ol[^>]*>[\s\S]*<\/ol>/, newContent)
      return html.slice(0, contentStart) + updated + html.slice(endIdx)
    }
    if (/<p>\[%[\s\S]*<\/p>/.test(region)) {
      const updated = region.replace(/<p>\[%[\s\S]*<\/p>/, newContent)
      return html.slice(0, contentStart) + updated + html.slice(endIdx)
    }

    searchFrom = endIdx + endMarker.length
  }
}

function replaceToken(html: string, token: string, value: string): string {
  if (!html.includes(token)) throw new Error(`Template token not found: ${token}`)
  return html.replace(token, escapeHtml(value))
}

function stripRegion(html: string, startMarker: string, endMarker: string): string {
  const startIdx = html.indexOf(startMarker)
  if (startIdx === -1) throw new Error(`Template marker not found: ${startMarker}`)
  const endIdx = html.indexOf(endMarker, startIdx)
  if (endIdx === -1) throw new Error(`Template marker not found: ${endMarker}`)
  return html.slice(0, startIdx) + html.slice(endIdx + endMarker.length)
}

function postProcess(html: string): string {
  return html
    .replace(/<a /g, '<a style="color:#85152A; text-decoration:none;" ')
    .replace(/<ol>/g, '<ol style="margin-top:0; padding-left:20px;">')
    .replace(/<ul>/g, '<ul style="margin-top:0; padding-left:20px;">')
    .replace(/<h2>/g, '<h2 style="font-size:24px; color:#85152A; margin-bottom:5px;">')
    .replace(/<h3>/g, '<h3 style="font-size:18px; color:#85152A; margin-bottom:5px;">')
}

function renderMarkdown(markdown: string): string {
  return postProcess(marked.parse(markdown, { async: false }) as string)
}

function buildGreeting(named: string, fallback: string): string {
  const namedWithTag = escapeHtml(named).replace('[Sympa Name]', '[% user.gecos %]')
  return `<p>[% IF user.gecos -%] ${namedWithTag} [%~ ELSE -%] ${escapeHtml(fallback)}[%~ END -%]</p>`
}

function buildToc(items: string[]): string {
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  return `<ol style="margin-top:0; padding-left:20px;">${lis}</ol>`
}

function buildPlainTextWithLineBreaks(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

function assembleHtml(state: PersistedState): string {
  let html = templateHtml

  if (!state.englishEnabled) {
    html = stripRegion(html, '<!-- EDIT EnglishNotice -->', '<!-- EnglishNotice End -->')
    html = stripRegion(html, '<!-- ENGLISH BLOCK START -->', '<!-- ENGLISH BLOCK END -->')
  } else {
    html = replaceSection(html, '<!-- EDIT EnglishNotice -->', '<!-- EnglishNotice End -->', escapeHtml(state.englishNotice))
  }

  html = replaceSection(html, '<!-- EDIT Title -->', '<!-- Title End -->', escapeHtml(state.deTitle))
  html = replaceSection(
    html,
    '<!-- EDIT optional Greeting -->',
    '<!-- EDIT Introduction -->',
    buildGreeting(state.deGreeting1, state.deGreeting2)
  )
  html = replaceSection(
    html,
    '<!-- EDIT Introduction -->',
    '<!-- Introduction End -->',
    renderMarkdown(state.deIntro)
  )
  html = replaceSection(html, '<!-- EDIT TocTitleDE -->', '<!-- TocTitleDE End -->', escapeHtml(state.deTocTitle))
  html = replaceSection(
    html,
    '<!-- EDIT ordered List / unordered List of table of contents -->',
    '<!-- End of List-->',
    buildToc(state.deToc)
  )
  html = replaceSection(
    html,
    '<!-- EDIT Main Content -->',
    '<!-- Main Content End-->',
    renderMarkdown(state.deMain)
  )
  html = replaceSection(html, '<!-- EDIT FinalGreetingDE1 -->', '<!-- FinalGreetingDE1 End -->', escapeHtml(state.deFinalGreeting1))
  html = replaceSection(html, '<!-- EDIT FinalGreetingDE2 -->', '<!-- FinalGreetingDE2 End -->', escapeHtml(state.deFinalGreeting2))

  if (state.englishEnabled) {
    html = replaceSection(html, '<!-- EDIT TitleEN -->', '<!-- TitleEN End -->', escapeHtml(state.enTitle))
    html = replaceSection(
      html,
      '<!-- EDIT optional Greeting English  -->',
      '<!-- EDIT Introduction  -->',
      buildGreeting(state.enGreeting1, state.enGreeting2)
    )
    html = replaceSection(
      html,
      '<!-- EDIT Introduction  -->',
      '<!-- Introduction End   -->',
      renderMarkdown(state.enIntro)
    )
    html = replaceSection(html, '<!-- EDIT TocTitleEN -->', '<!-- TocTitleEN End -->', escapeHtml(state.enTocTitle))
    html = replaceSection(
      html,
      '<!-- EDIT ordered List / unordered List of table of contents   -->',
      '<!-- End of List-->',
      buildToc(state.enToc)
    )
    html = replaceSection(
      html,
      '<!-- EDIT Main Content -->',
      '<!-- Main Content End-->',
      renderMarkdown(state.enMain)
    )
    html = replaceSection(html, '<!-- EDIT FinalGreetingEN1 -->', '<!-- FinalGreetingEN1 End -->', escapeHtml(state.enFinalGreeting1))
    html = replaceSection(html, '<!-- EDIT FinalGreetingEN2 -->', '<!-- FinalGreetingEN2 End -->', escapeHtml(state.enFinalGreeting2))
  }

  html = replaceSection(html, '<!-- EDIT FooterAddress -->', '<!-- FooterAddress End -->', buildPlainTextWithLineBreaks(state.footerAddress))
  html = replaceSection(html, '<!-- EDIT FooterEmailText -->', '<!-- FooterEmailText End -->', escapeHtml(state.footerEmailText))
  html = replaceSection(html, '<!-- EDIT FooterMailinglistText -->', '<!-- FooterMailinglistText End -->', escapeHtml(state.footerMailinglistText))
  html = replaceSection(html, '<!-- EDIT FooterUnsubscribeText -->', '<!-- FooterUnsubscribeText End -->', escapeHtml(state.footerUnsubscribeText))
  html = replaceSection(html, '<!-- EDIT FooterUnsubscribeLinkText -->', '<!-- FooterUnsubscribeLinkText End -->', escapeHtml(state.footerUnsubscribeLinkText))

  html = replaceToken(html, '{{FOOTER_EMAIL_HREF}}', state.footerEmailHref)
  html = replaceToken(html, '{{FOOTER_MAILINGLIST_HREF}}', state.footerMailinglistHref)
  html = replaceToken(html, '{{FOOTER_UNSUBSCRIBE_HREF}}', state.footerUnsubscribeLinkHref)

  return html
}

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number) {
  let timer: number | undefined
  return (...args: Args) => {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), ms)
  }
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing element #${id}`)
  return el as T
}

const deTitleInput = $<HTMLInputElement>('de-title')
const enTitleInput = $<HTMLInputElement>('en-title')
const englishNoticeInput = $<HTMLInputElement>('english-notice')

const deGreeting1Input = $<HTMLInputElement>('de-greeting-1')
const deGreeting2Input = $<HTMLInputElement>('de-greeting-2')
const enGreeting1Input = $<HTMLInputElement>('en-greeting-1')
const enGreeting2Input = $<HTMLInputElement>('en-greeting-2')

const deTocTitleInput = $<HTMLInputElement>('de-toc-title')
const enTocTitleInput = $<HTMLInputElement>('en-toc-title')
const deTocList = $<HTMLDivElement>('de-toc-list')
const enTocList = $<HTMLDivElement>('en-toc-list')
const deTocAddBtn = $<HTMLButtonElement>('de-toc-add')
const enTocAddBtn = $<HTMLButtonElement>('en-toc-add')

const deFinalGreeting1Input = $<HTMLInputElement>('de-final-greeting-1')
const deFinalGreeting2Input = $<HTMLInputElement>('de-final-greeting-2')
const enFinalGreeting1Input = $<HTMLInputElement>('en-final-greeting-1')
const enFinalGreeting2Input = $<HTMLInputElement>('en-final-greeting-2')

const footerAddressInput = $<HTMLTextAreaElement>('footer-address')
const footerEmailTextInput = $<HTMLInputElement>('footer-email-text')
const footerEmailHrefInput = $<HTMLInputElement>('footer-email-href')
const footerMailinglistTextInput = $<HTMLInputElement>('footer-mailinglist-text')
const footerMailinglistHrefInput = $<HTMLInputElement>('footer-mailinglist-href')
const footerUnsubscribeTextInput = $<HTMLInputElement>('footer-unsubscribe-text')
const footerUnsubscribeLinkTextInput = $<HTMLInputElement>('footer-unsubscribe-link-text')
const footerUnsubscribeLinkHrefInput = $<HTMLInputElement>('footer-unsubscribe-link-href')

const toggleEnglishBtn = $<HTMLButtonElement>('toggle-english')

const previewIframe = $<HTMLIFrameElement>('preview')

let deIntroMde: EasyMDE
let enIntroMde: EasyMDE
let deMainMde: EasyMDE
let enMainMde: EasyMDE

let englishEnabled = true

function createTocRow(list: HTMLDivElement, value: string): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'toc-row'

  const input = document.createElement('input')
  input.type = 'text'
  input.value = value
  input.addEventListener('input', scheduleUpdate)

  const removeBtn = document.createElement('button')
  removeBtn.type = 'button'
  removeBtn.textContent = '−'
  removeBtn.addEventListener('click', () => {
    row.remove()
    scheduleUpdate()
  })

  row.appendChild(input)
  row.appendChild(removeBtn)
  list.appendChild(row)
  return row
}

function getTocValues(list: HTMLDivElement): string[] {
  return Array.from(list.querySelectorAll<HTMLInputElement>('input[type="text"]')).map(
    (input) => input.value
  )
}

function setTocValues(list: HTMLDivElement, values: string[]): void {
  list.innerHTML = ''
  for (const value of values) {
    createTocRow(list, value)
  }
}

function collectState(): PersistedState {
  return {
    deTitle: deTitleInput.value,
    enTitle: enTitleInput.value,
    englishNotice: englishNoticeInput.value,
    deGreeting1: deGreeting1Input.value,
    deGreeting2: deGreeting2Input.value,
    enGreeting1: enGreeting1Input.value,
    enGreeting2: enGreeting2Input.value,
    deIntro: deIntroMde.value(),
    enIntro: enIntroMde.value(),
    deTocTitle: deTocTitleInput.value,
    enTocTitle: enTocTitleInput.value,
    deToc: getTocValues(deTocList),
    enToc: getTocValues(enTocList),
    deMain: deMainMde.value(),
    enMain: enMainMde.value(),
    deFinalGreeting1: deFinalGreeting1Input.value,
    deFinalGreeting2: deFinalGreeting2Input.value,
    enFinalGreeting1: enFinalGreeting1Input.value,
    enFinalGreeting2: enFinalGreeting2Input.value,
    footerAddress: footerAddressInput.value,
    footerEmailText: footerEmailTextInput.value,
    footerEmailHref: footerEmailHrefInput.value,
    footerMailinglistText: footerMailinglistTextInput.value,
    footerMailinglistHref: footerMailinglistHrefInput.value,
    footerUnsubscribeText: footerUnsubscribeTextInput.value,
    footerUnsubscribeLinkText: footerUnsubscribeLinkTextInput.value,
    footerUnsubscribeLinkHref: footerUnsubscribeLinkHrefInput.value,
    englishEnabled,
  }
}

const MOBILE_QUERY = window.matchMedia('(max-width: 900px)')

// The single, currently-attached iframe `load` handler. `updatePreview` runs
// often (debounced per keystroke); replacing srcdoc fires a fresh `load`, so we
// keep exactly one handler alive at a time to avoid listener buildup.
let pendingPreviewLoad: (() => void) | null = null

function updatePreview(): void {
  const state = collectState()

  // Capture the preview's scroll position so reassigning srcdoc (which rebuilds
  // the whole document and resets scroll to 0) doesn't snap the user to the top.
  let scrollX = 0
  let scrollY = 0
  try {
    scrollX = previewIframe.contentWindow?.scrollX ?? 0
    scrollY = previewIframe.contentWindow?.scrollY ?? 0
  } catch {
    // contentWindow not readable yet (e.g. first call) — start from the top.
  }

  if (pendingPreviewLoad) {
    previewIframe.removeEventListener('load', pendingPreviewLoad)
    pendingPreviewLoad = null
  }

  const onLoad = () => {
    // On narrow screens the preview lives in normal page flow, so size the
    // iframe to its full content height (no nested scrollbar). On wide screens
    // it fills the fixed-height sticky container, so leave height to CSS.
    if (MOBILE_QUERY.matches) {
      const doc = previewIframe.contentWindow?.document
      if (doc) {
        // Reset to 0 first: scrollHeight returns max(content, frame), so if the
        // old frame height is larger than the new content the iframe would never
        // shrink. Collapsing to 0 forces scrollHeight == true content height.
        previewIframe.style.height = '0px'
        previewIframe.style.height = `${doc.documentElement.scrollHeight}px`
      }
    } else {
      previewIframe.style.height = ''
    }
    previewIframe.contentWindow?.scrollTo(scrollX, scrollY)
  }
  pendingPreviewLoad = onLoad
  previewIframe.addEventListener('load', onLoad, { once: true })

  previewIframe.srcdoc = assembleHtml(state)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const scheduleUpdate = debounce(updatePreview, 200)

function loadState(): PersistedState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultState()
  try {
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

function setEnglishVisibility(enabled: boolean): void {
  document.querySelectorAll<HTMLElement>('.english-only').forEach((el) => {
    el.style.display = enabled ? '' : 'none'
  })
  toggleEnglishBtn.textContent = enabled ? 'English: On' : 'English: Off'
}

function applyState(state: PersistedState): void {
  deTitleInput.value = state.deTitle
  enTitleInput.value = state.enTitle
  englishNoticeInput.value = state.englishNotice

  deGreeting1Input.value = state.deGreeting1
  deGreeting2Input.value = state.deGreeting2
  enGreeting1Input.value = state.enGreeting1
  enGreeting2Input.value = state.enGreeting2

  deIntroMde.value(state.deIntro)
  enIntroMde.value(state.enIntro)
  deMainMde.value(state.deMain)
  enMainMde.value(state.enMain)

  deTocTitleInput.value = state.deTocTitle
  enTocTitleInput.value = state.enTocTitle
  setTocValues(deTocList, state.deToc)
  setTocValues(enTocList, state.enToc)

  deFinalGreeting1Input.value = state.deFinalGreeting1
  deFinalGreeting2Input.value = state.deFinalGreeting2
  enFinalGreeting1Input.value = state.enFinalGreeting1
  enFinalGreeting2Input.value = state.enFinalGreeting2

  footerAddressInput.value = state.footerAddress
  footerEmailTextInput.value = state.footerEmailText
  footerEmailHrefInput.value = state.footerEmailHref
  footerMailinglistTextInput.value = state.footerMailinglistText
  footerMailinglistHrefInput.value = state.footerMailinglistHref
  footerUnsubscribeTextInput.value = state.footerUnsubscribeText
  footerUnsubscribeLinkTextInput.value = state.footerUnsubscribeLinkText
  footerUnsubscribeLinkHrefInput.value = state.footerUnsubscribeLinkHref

  englishEnabled = state.englishEnabled
  setEnglishVisibility(englishEnabled)
}

function initEasyMde(elementId: string): EasyMDE {
  return new EasyMDE({
    element: document.getElementById(elementId) as HTMLTextAreaElement,
    spellChecker: false,
    status: false,
    toolbar: [...EDITOR_TOOLBAR_OPTIONS],
  })
}

const HEADING_DEBOUNCE_MS = 700
const H1_PATTERN = /^#(?!#)\s/m
const H4_PLUS_PATTERN = /^#{4,6}\s/m
const HEADING_HINT_TEXT =
  'Only H2 (##) and H3 (###) headings are allowed here — please remove the H1 (#) or H4–H6 (####+) heading.'
const COPY_EXPORT_BUTTON_IDS = [
  'copy-html-top', 'copy-html-bottom', 'export-html-top', 'export-html-bottom',
]

// Editors that currently contain an invalid heading. Drives both the yellow
// copy/export buttons and the ignorable confirm dialog on those buttons.
const editorsWithWarning = new Set<EasyMDE>()

// One persistent hint element per editor, created lazily on first check and
// shown/hidden as the warning state changes.
const headingHints = new WeakMap<EasyMDE, HTMLElement>()

function headingHintFor(mde: EasyMDE): HTMLElement {
  let hint = headingHints.get(mde)
  if (hint) return hint
  hint = document.createElement('p')
  hint.className = 'heading-warning-hint'
  hint.textContent = HEADING_HINT_TEXT
  hint.hidden = true
  // The CodeMirror wrapper lives inside EasyMDE's container; drop the hint
  // right after that container so it sits below the editor box.
  const wrapper = mde.codemirror.getWrapperElement()
  const container = wrapper.closest('.EasyMDEContainer') ?? wrapper
  container.parentElement?.insertBefore(hint, container.nextSibling)
  headingHints.set(mde, hint)
  return hint
}

function updateWarningButtons(): void {
  const hasWarning = editorsWithWarning.size > 0
  for (const id of COPY_EXPORT_BUTTON_IDS) {
    $<HTMLButtonElement>(id).classList.toggle('has-warning', hasWarning)
  }
}

function checkHeadings(mde: EasyMDE): void {
  const content = mde.value()
  const hasInvalidHeading = H1_PATTERN.test(content) || H4_PLUS_PATTERN.test(content)
  const wrapper = mde.codemirror.getWrapperElement()
  wrapper.classList.toggle('heading-warning', hasInvalidHeading)
  headingHintFor(mde).hidden = !hasInvalidHeading

  if (hasInvalidHeading) editorsWithWarning.add(mde)
  else editorsWithWarning.delete(mde)
  updateWarningButtons()
}

// Copy/export still work with an invalid heading present, but warn first so the
// user can knowingly proceed (e.g. the heading is intentional).
function confirmIfHeadingWarning(): boolean {
  if (editorsWithWarning.size === 0) return true
  return confirm(
    'One or more text boxes contain an invalid heading — only H2 (##) and H3 (###) ' +
      'are allowed in the email body. The newsletter may not render correctly.\n\n' +
      'Continue anyway?'
  )
}

function showCopyFeedback(button: HTMLButtonElement): void {
  const original = button.textContent
  button.textContent = 'Copied!'
  button.classList.add('copy-feedback')
  setTimeout(() => {
    button.textContent = original
    button.classList.remove('copy-feedback')
  }, 1500)
}

async function copyHtml(button: HTMLButtonElement): Promise<void> {
  if (!confirmIfHeadingWarning()) return
  const html = assembleHtml(collectState())
  await navigator.clipboard.writeText(html)
  showCopyFeedback(button)
}

function exportHtml(): void {
  if (!confirmIfHeadingWarning()) return
  const html = assembleHtml(collectState())
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'asta-newsletter.html'
  a.click()
  URL.revokeObjectURL(url)
}

const draftFeedback = $<HTMLParagraphElement>('draft-feedback')
let draftFeedbackTimer: number | undefined

function showDraftFeedback(message: string, isError = false): void {
  draftFeedback.textContent = message
  draftFeedback.classList.toggle('error', isError)
  draftFeedback.hidden = false
  if (draftFeedbackTimer !== undefined) window.clearTimeout(draftFeedbackTimer)
  draftFeedbackTimer = window.setTimeout(() => {
    draftFeedback.hidden = true
  }, 3000)
}

// Export/import the same state shape localStorage already persists, but as a
// portable file so a draft can be shared or backed up outside the browser.
function exportDraft(): void {
  const json = JSON.stringify(collectState(), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'asta-newsletter-draft.json'
  a.click()
  URL.revokeObjectURL(url)
}

async function importDraft(file: File): Promise<void> {
  try {
    const parsed = JSON.parse(await file.text())
    // Merge over defaults so older/newer drafts with missing/extra fields still load.
    applyState({ ...defaultState(), ...parsed })
    for (const mde of [deIntroMde, enIntroMde, deMainMde, enMainMde]) checkHeadings(mde)
    updatePreview()
    showDraftFeedback('Draft imported.')
  } catch {
    showDraftFeedback('Could not import draft — not a valid draft file.', true)
  }
}

function renderSiteFooterNote(): void {
  const note = $<HTMLParagraphElement>('site-footer-note')
  const license = `<a href="${__APP_LICENSE_URL__}" target="_blank" rel="noopener">MIT License</a>`
  const email = `<a href="mailto:${__APP_CONTACT_EMAIL__}">${__APP_CONTACT_EMAIL__}</a>`
  note.innerHTML =
    `Built in ${__APP_CREATED__} by ${__APP_AUTHOR__} for the AStA Uni Bonn. ` +
    `Released under the ${license}. Questions or feedback? Reach out at ${email}.`
}

function resetAll(): void {
  if (!confirm('Reset all fields and clear saved data?')) return
  localStorage.removeItem(STORAGE_KEY)
  applyState(defaultState())
  for (const mde of [deIntroMde, enIntroMde, deMainMde, enMainMde]) checkHeadings(mde)
  updatePreview()
}

function init(): void {
  deIntroMde = initEasyMde('de-intro')
  enIntroMde = initEasyMde('en-intro')
  deMainMde = initEasyMde('de-main')
  enMainMde = initEasyMde('en-main')

  for (const mde of [deIntroMde, enIntroMde, deMainMde, enMainMde]) {
    const scheduleHeadingCheck = debounce(() => checkHeadings(mde), HEADING_DEBOUNCE_MS)
    mde.codemirror.on('change', () => {
      scheduleUpdate()
      scheduleHeadingCheck()
    })
  }

  const plainTextInputs = [
    deTitleInput, enTitleInput, englishNoticeInput,
    deGreeting1Input, deGreeting2Input, enGreeting1Input, enGreeting2Input,
    deTocTitleInput, enTocTitleInput,
    deFinalGreeting1Input, deFinalGreeting2Input, enFinalGreeting1Input, enFinalGreeting2Input,
    footerAddressInput, footerEmailTextInput, footerEmailHrefInput,
    footerMailinglistTextInput, footerMailinglistHrefInput,
    footerUnsubscribeTextInput, footerUnsubscribeLinkTextInput, footerUnsubscribeLinkHrefInput,
  ]
  for (const input of plainTextInputs) {
    input.addEventListener('input', scheduleUpdate)
  }

  deTocAddBtn.addEventListener('click', () => {
    createTocRow(deTocList, 'item')
    scheduleUpdate()
  })
  enTocAddBtn.addEventListener('click', () => {
    createTocRow(enTocList, 'item')
    scheduleUpdate()
  })

  toggleEnglishBtn.addEventListener('click', () => {
    englishEnabled = !englishEnabled
    setEnglishVisibility(englishEnabled)
    scheduleUpdate()
  })

  $<HTMLButtonElement>('copy-html-top').addEventListener('click', (e) =>
    copyHtml(e.currentTarget as HTMLButtonElement)
  )
  $<HTMLButtonElement>('copy-html-bottom').addEventListener('click', (e) =>
    copyHtml(e.currentTarget as HTMLButtonElement)
  )
  $<HTMLButtonElement>('export-html-top').addEventListener('click', exportHtml)
  $<HTMLButtonElement>('export-html-bottom').addEventListener('click', exportHtml)
  $<HTMLButtonElement>('reset-all-top').addEventListener('click', resetAll)
  $<HTMLButtonElement>('reset-all').addEventListener('click', resetAll)

  const importDraftFile = $<HTMLInputElement>('import-draft-file')
  $<HTMLButtonElement>('export-draft').addEventListener('click', exportDraft)
  $<HTMLButtonElement>('import-draft').addEventListener('click', () => importDraftFile.click())
  importDraftFile.addEventListener('change', () => {
    const file = importDraftFile.files?.[0]
    if (file) importDraft(file)
    importDraftFile.value = '' // allow re-importing the same file name
  })

  // Re-evaluate the iframe height when crossing the mobile/desktop breakpoint.
  MOBILE_QUERY.addEventListener('change', updatePreview)

  renderSiteFooterNote()

  applyState(loadState())
  for (const mde of [deIntroMde, enIntroMde, deMainMde, enMainMde]) checkHeadings(mde)
  updatePreview()
}

init()
