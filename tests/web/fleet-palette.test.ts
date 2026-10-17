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
