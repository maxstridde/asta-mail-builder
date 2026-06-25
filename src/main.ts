import EasyMDE from 'easymde'
import { marked } from 'marked'
import 'easymde/dist/easymde.min.css'
import templateHtml from './template.html?raw'
import './style.css'

const STORAGE_KEY = 'asta-mail-builder'
const TOC_DEFAULT_COUNT = 8

interface PersistedState {
  deGreeting1: string
  deGreeting2: string
  enGreeting1: string
  enGreeting2: string
  deIntro: string
  enIntro: string
  deMain: string
  enMain: string
  deToc: string[]
  enToc: string[]
}

function defaultState(): PersistedState {
  const toc = () => Array.from({ length: TOC_DEFAULT_COUNT }, (_, i) => `item ${i + 1}`)
  return {
    deGreeting1: 'Hallo [Sympa Name],',
    deGreeting2: 'Hallo!',
    enGreeting1: 'Hello [Sympa Name],',
    enGreeting2: 'Hello!',
    deIntro: '',
    enIntro: '',
    deMain: '',
    enMain: '',
    deToc: toc(),
    enToc: toc(),
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

function assembleHtml(state: PersistedState): string {
  let html = templateHtml

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

const deGreeting1Input = $<HTMLInputElement>('de-greeting-1')
const deGreeting2Input = $<HTMLInputElement>('de-greeting-2')
const enGreeting1Input = $<HTMLInputElement>('en-greeting-1')
const enGreeting2Input = $<HTMLInputElement>('en-greeting-2')

const deTocList = $<HTMLDivElement>('de-toc-list')
const enTocList = $<HTMLDivElement>('en-toc-list')
const deTocAddBtn = $<HTMLButtonElement>('de-toc-add')
const enTocAddBtn = $<HTMLButtonElement>('en-toc-add')

const previewIframe = $<HTMLIFrameElement>('preview')

let deIntroMde: EasyMDE
let enIntroMde: EasyMDE
let deMainMde: EasyMDE
let enMainMde: EasyMDE

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
    deGreeting1: deGreeting1Input.value,
    deGreeting2: deGreeting2Input.value,
    enGreeting1: enGreeting1Input.value,
    enGreeting2: enGreeting2Input.value,
    deIntro: deIntroMde.value(),
    enIntro: enIntroMde.value(),
    deMain: deMainMde.value(),
    enMain: enMainMde.value(),
    deToc: getTocValues(deTocList),
    enToc: getTocValues(enTocList),
  }
}

function updatePreview(): void {
  const state = collectState()
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

function applyState(state: PersistedState): void {
  deGreeting1Input.value = state.deGreeting1
  deGreeting2Input.value = state.deGreeting2
  enGreeting1Input.value = state.enGreeting1
  enGreeting2Input.value = state.enGreeting2

  deIntroMde.value(state.deIntro)
  enIntroMde.value(state.enIntro)
  deMainMde.value(state.deMain)
  enMainMde.value(state.enMain)

  setTocValues(deTocList, state.deToc)
  setTocValues(enTocList, state.enToc)
}

function initEasyMde(elementId: string): EasyMDE {
  return new EasyMDE({
    element: document.getElementById(elementId) as HTMLTextAreaElement,
    spellChecker: false,
    status: false,
  })
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
  const html = assembleHtml(collectState())
  await navigator.clipboard.writeText(html)
  showCopyFeedback(button)
}

function exportHtml(): void {
  const html = assembleHtml(collectState())
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'asta-newsletter.html'
  a.click()
  URL.revokeObjectURL(url)
}

function resetAll(): void {
  if (!confirm('Reset all fields and clear saved data?')) return
  localStorage.removeItem(STORAGE_KEY)
  applyState(defaultState())
  updatePreview()
}

function init(): void {
  deIntroMde = initEasyMde('de-intro')
  enIntroMde = initEasyMde('en-intro')
  deMainMde = initEasyMde('de-main')
  enMainMde = initEasyMde('en-main')

  for (const mde of [deIntroMde, enIntroMde, deMainMde, enMainMde]) {
    mde.codemirror.on('change', scheduleUpdate)
  }

  for (const input of [deGreeting1Input, deGreeting2Input, enGreeting1Input, enGreeting2Input]) {
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

  $<HTMLButtonElement>('copy-html-top').addEventListener('click', (e) =>
    copyHtml(e.currentTarget as HTMLButtonElement)
  )
  $<HTMLButtonElement>('copy-html-bottom').addEventListener('click', (e) =>
    copyHtml(e.currentTarget as HTMLButtonElement)
  )
  $<HTMLButtonElement>('export-html-top').addEventListener('click', exportHtml)
  $<HTMLButtonElement>('export-html-bottom').addEventListener('click', exportHtml)
  $<HTMLButtonElement>('reset-all').addEventListener('click', resetAll)

  applyState(loadState())
  updatePreview()
}

init()
