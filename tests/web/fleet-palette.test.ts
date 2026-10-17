/**
 * Ticket #3. The console theme paints from the six Fleet colors.
 * The seam is the computed color of a document that loads the theme stylesheets.
 */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'

const root = new URL('../../', import.meta.url)
const globals = readFileSync(new URL('web/src/styles/globals.css', root), 'utf8')
const ask = readFileSync(new URL('web/src/styles/walnut-agent.css', root), 'utf8')

const PAPER = 'rgb(246, 245, 243)'
const INK = 'rgb(18, 16, 12)'
const CLAY = 'rgb(215, 210, 200)'
const MUTED = 'rgb(97, 92, 84)'
const RULE = 'rgb(207, 202, 191)'
const ORANGE = 'rgb(244, 91, 37)'

const marks = `
  <div id="fill"></div>
  <div id="muted"></div>
  <div id="rule"></div>
  <div id="accent"></div>
  <div id="running"></div>
  <div id="success"></div>
  <div id="warning"></div>
  <div id="error"></div>
  <div id="tier-focus"></div>
  <div id="tier-satellite"></div>
  <div id="tier-backlog"></div>
  <div id="tier-wait"></div>
  <div id="tier-custom"></div>
  <div id="ask"></div>
  <style>
    #fill { background: var(--bg-secondary); }
    #muted { color: var(--fg-muted); }
    #rule { border-top: 1px solid var(--border); }
    #accent { background: var(--accent); }
    #running { color: var(--accent-text); }
    #success { background: var(--success); }
    #warning { background: var(--warning); }
    #error { background: var(--error); }
    #tier-focus { background: var(--tier-focus); }
    #tier-satellite { background: var(--tier-satellite); }
    #tier-backlog { background: var(--tier-backlog); }
    #tier-wait { background: var(--tier-wait); }
    #tier-custom { background: var(--tier-custom); }
    #ask { color: var(--walnut-accent); }
  </style>
`

describe('Fleet palette', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] })
    page = await browser.newPage()
    await page.setContent(`<!doctype html><html><head><style>${globals}\n${ask}</style></head><body>${marks}</body></html>`)
  })

  afterAll(async () => {
    await browser?.close()
  })

  async function theme(name: 'light' | 'dark'): Promise<void> {
    await page.evaluate((themeName) => {
      document.documentElement.dataset.theme = themeName
    }, name)
  }

  async function paint(id: string, prop: string): Promise<string> {
    return page.locator(id).evaluate((el, property) => getComputedStyle(el).getPropertyValue(property).trim(), prop)
  }

  it('paints the light page paper, the text ink, the accent orange and a border rule', async () => {
    await theme('light')
    expect(await paint('body', 'background-color')).toBe(PAPER)
    expect(await paint('body', 'color')).toBe(INK)
    expect(await paint('#accent', 'background-color')).toBe(ORANGE)
    expect(await paint('#rule', 'border-top-color')).toBe(RULE)
  })

  it('paints support text muted and a neutral fill clay', async () => {
    await theme('light')
    expect(await paint('#muted', 'color')).toBe(MUTED)
    expect(await paint('#fill', 'background-color')).toBe(CLAY)
  })

  it('paints the dark page ink, the text clay and the accent orange', async () => {
    await theme('dark')
    expect(await paint('body', 'background-color')).toBe(INK)
    expect(await paint('body', 'color')).toBe(CLAY)
    expect(await paint('#accent', 'background-color')).toBe(ORANGE)
  })

  it('keeps orange as the accent a person acts with, not the page and not the text', async () => {
    for (const name of ['light', 'dark'] as const) {
      await theme(name)
      expect(await paint('body', 'background-color')).not.toBe(ORANGE)
      expect(await paint('body', 'color')).not.toBe(ORANGE)
      expect(await paint('#running', 'color')).not.toBe(ORANGE)
      expect(await paint('#accent', 'background-color')).toBe(ORANGE)
      expect(await paint('#accent', 'background-color')).not.toBe('rgb(0, 122, 255)')
      expect(await paint('#accent', 'background-color')).not.toBe('rgb(10, 132, 255)')
    }
  })

  it('paints success, warning, error and board tiers muted', async () => {
    const tier = ['#tier-focus', '#tier-satellite', '#tier-backlog', '#tier-wait', '#tier-custom']
    const forbidden = [
      'rgb(52, 199, 89)',
      'rgb(255, 149, 0)',
      'rgb(255, 59, 48)',
      'rgb(88, 86, 214)',
      'rgb(48, 176, 199)',
      'rgb(255, 159, 10)',
      'rgb(175, 82, 222)',
      'rgb(94, 92, 230)',
      'rgb(64, 200, 224)',
      'rgb(255, 179, 64)',
      'rgb(191, 90, 242)',
    ]
    for (const name of ['light', 'dark'] as const) {
      await theme(name)
      expect(await paint('#success', 'background-color')).toBe(MUTED)
      expect(await paint('#warning', 'background-color')).toBe(MUTED)
      expect(await paint('#error', 'background-color')).toBe(MUTED)
      for (const id of tier) {
        const color = await paint(id, 'background-color')
        expect(color).toBe(MUTED)
        expect(forbidden).not.toContain(color)
      }
    }
  })

  it('does not keep the old amber on the Ask accent', async () => {
    for (const name of ['light', 'dark'] as const) {
      await theme(name)
      const color = await paint('#ask', 'color')
      expect(color).not.toBe('rgb(180, 83, 9)')
      expect(color).not.toBe('rgb(224, 163, 90)')
    }
  })
})

/** Settings icons, the activity chart, and board status marks use the six Fleet colors. */
const PAINTED = [
  'web/src/components/settings/core-settings-registry.tsx',
  'web/src/components/settings/SettingsNav.tsx',
  'web/src/components/settings/settings-icons.tsx',
  'web/src/components/settings/sections/TimelineSection.tsx',
  'web/src/components/board/board-runtime.css.ts',
]
const OLD_HUES = [
  '#007aff', '#0a84ff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#5e5ce6',
  '#30b0c7', '#5ac8fa', '#af52de', '#ff2d55', '#a2845e', '#ff6b6b', '#64748b',
  '#b45309', '#e0a35a', '#d93025', '#2f6feb', '#15803d', '#d97706',
  '#636366', '#8e8e93', '#6e6e73', '#1e1e2e', '#cdd6f4',
]

describe('settings and board marks', () => {
  it('paints the custom tier and the leftover marks from the six colors', () => {
    const theme = globals.toLowerCase()
    expect(globals).toContain('.cal-rail-tier-custom { background: var(--tier-custom)')
    expect(theme).not.toContain('#8b5cf6')
    expect(theme).not.toContain('#ff6b00')
    expect(theme).not.toContain('#e68a00')
    expect(theme).not.toContain('#2ea84f')
    const board = readFileSync(new URL('web/src/components/board/board-runtime.css.ts', root), 'utf8')
    expect(board).not.toContain('rgba(21,128,61')
    expect(board).not.toContain('rgba(217,48,37')
    expect(ask).toContain('.draft-intent-card-walnut.is-active .draft-intent-t { color: var(--fg); }')
    const chart = readFileSync(new URL('web/src/components/settings/sections/TimelineSection.tsx', root), 'utf8')
    expect(chart).not.toContain("browsing: '#12100C'")
    expect(chart).not.toContain("writing: '#12100C'")
    expect(chart).not.toContain("idle: '#12100C'")
  })

  it('keeps only the six Fleet colors', () => {
    for (const rel of PAINTED) {
      const text = readFileSync(new URL(rel, root), 'utf8').toLowerCase()
      for (const hex of OLD_HUES) expect(text, `${rel} still has ${hex}`).not.toContain(hex)
      expect(text, rel).toContain('#615c54')
    }
  })
})
