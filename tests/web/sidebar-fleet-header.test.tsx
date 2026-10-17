/**
 * Ticket #2. The expanded sidebar header shows the official horizontal logo
 * at the artboard's own width, light or dark with the theme. The collapsed
 * rail keeps the collapse button and does not show the logo. The tab, the
 * system card, the intent-card image and the focus dock's visible label say Fleet.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createElement } from '../../web/node_modules/react/index.js'
import { renderToStaticMarkup } from '../../web/node_modules/react-dom/server.node.js'
import { parseHTML } from 'linkedom'
import { SidebarHeader } from '@/components/layout/sidebar-header'
import { FleetSymbol, fleetSymbolHref, syncTabIcon, tabIconIsDark, watchTabIcon } from '@/brand/fleet-mark'
import { DockVisibleLabel } from '@/components/dock/dock-visible-label'
import { NotificationUpdateCard } from '@/components/common/NotificationUpdateCard'
import type { UpdateStatus } from '@/api/update'

const root = new URL('../../', import.meta.url)

function text(path: string): string {
  return readFileSync(new URL(path, root), 'utf8')
}

function header(collapsed: boolean): string {
  return renderToStaticMarkup(createElement(SidebarHeader, {
    collapsed,
    onToggleCollapse: () => {},
  }))
}

const status: UpdateStatus = {
  enabled: true,
  install: { kind: 'npm', sourceDir: null, packageRoot: null, manager: 'npm', updateCommand: null },
  current: '0.1.0',
  channel: 'stable',
  latest: '0.1.0',
  tags: { latest: '0.1.0', nightly: null },
  available: false,
  checkedAt: null,
  error: null,
  checking: false,
  packageUrl: 'https://example.invalid/fleet',
}

describe('which logo the theme shows', () => {
  const css = () => text('web/src/styles/globals.css')

  it('shows only the light horizontal logo in the light theme', () => {
    const sheet = css()
    const html = header(false)
    expect(html).toContain('src="/fleet-horizontal-light.svg"')
    expect(html).toContain('class="sidebar-fleet-logo fleet-mark-light"')
    expect(sheet).toContain('img.fleet-mark-dark { display: none; }')
  })

  it('shows only the dark horizontal logo in the dark theme', () => {
    const sheet = css()
    const html = header(false)
    expect(html).toContain('src="/fleet-horizontal-dark.svg"')
    expect(html).toContain('class="sidebar-fleet-logo fleet-mark-dark"')
    expect(sheet).toContain(':root[data-theme="dark"] img.fleet-mark-light { display: none; }')
    expect(sheet).toContain(':root[data-theme="dark"] img.fleet-mark-dark { display: block; }')
    expect(sheet).toContain(':root:not([data-theme]) img.fleet-mark-light { display: none; }')
    expect(sheet).toContain(':root:not([data-theme]) img.fleet-mark-dark { display: block; }')
  })
})

describe('expanded sidebar header', () => {
  it('shows the light horizontal logo at its own width, with Fleet as letter paths', () => {
    const html = header(false)
    expect(html).toContain('src="/fleet-horizontal-light.svg"')
    expect(html).toContain('alt="Fleet"')
    expect(html).toContain('width="84"')
    expect(html).toContain('height="31"')
    const svg = text('brand/svg/fleet-horizontal-light.svg')
    expect(svg).toContain('<path ')
    expect(svg).not.toContain('<text')
    expect(svg).not.toContain('font-family')
    const ink = (175.5 + 13.34 - 21.78) * 0.6
    expect(Math.round(ink / 140 * 31)).toBe(22)
  })

  it('shows the dark horizontal logo at its own width', () => {
    const html = header(false)
    expect(html).toContain('src="/fleet-horizontal-dark.svg"')
    expect(html).toContain('width="84"')
    expect(html).toContain('height="31"')
    const svg = text('brand/svg/fleet-horizontal-dark.svg')
    expect(svg).toContain('<path ')
    expect(svg).not.toContain('<text')
  })

  it('keeps the collapse button and hides the logo when the sidebar is collapsed', () => {
    const html = header(true)
    expect(html).toContain('sidebar-collapse-btn')
    expect(html).toContain('aria-label="Expand sidebar"')
    expect(html).not.toContain('fleet-horizontal')
    expect(html).not.toContain('walnut-icon')
  })
})

describe('Fleet tab, symbol and the other chrome words', () => {
  it('points the tab icon at the symbol for the theme', () => {
    expect(fleetSymbolHref(false)).toBe('/fleet-symbol-light.svg')
    expect(fleetSymbolHref(true)).toBe('/fleet-symbol-dark.svg')
    const { document: light } = parseHTML('<html><head><link rel="icon" href="/walnut-icon.png"></head></html>')
    syncTabIcon(light, false)
    expect(light.querySelector('link')?.getAttribute('href')).toBe('/fleet-symbol-light.svg')
    syncTabIcon(light, true)
    expect(light.querySelector('link')?.getAttribute('href')).toBe('/fleet-symbol-dark.svg')
    const { document: bare } = parseHTML('<html><head></head></html>')
    syncTabIcon(bare, true)
    expect(bare.querySelector('link')).toBeNull()
    expect(tabIconIsDark('dark', false)).toBe(true)
    expect(tabIconIsDark('light', true)).toBe(false)
    expect(tabIconIsDark(undefined, true)).toBe(true)
    expect(tabIconIsDark(undefined, false)).toBe(false)
  })

  it('keeps the tab icon on a later theme change and an operating-system change', () => {
    const { document: doc } = parseHTML('<html><head><link rel="icon" href="/walnut-icon.png"></head></html>')
    const listeners = new Map<string, () => void>()
    let matches = false
    let observed = false
    let disconnected = false
    let observerCb: (() => void) | null = null
    const view = {
      matchMedia: () => ({
        get matches() { return matches },
        addEventListener: (name: string, fn: () => void) => { listeners.set(name, fn) },
        removeEventListener: (name: string) => { listeners.delete(name) },
      }),
      MutationObserver: class {
        constructor(cb: () => void) { observerCb = cb }
        observe() { observed = true }
        disconnect() { disconnected = true }
      },
    }
    const stop = watchTabIcon(doc, view as unknown as Window)
    const icon = () => doc.querySelector('link')?.getAttribute('href')
    expect(observed).toBe(true)
    expect(icon()).toBe('/fleet-symbol-light.svg')
    matches = true
    listeners.get('change')?.()
    expect(icon()).toBe('/fleet-symbol-dark.svg')
    doc.documentElement.dataset.theme = 'light'
    observerCb?.()
    expect(icon()).toBe('/fleet-symbol-light.svg')
    doc.documentElement.dataset.theme = 'dark'
    observerCb?.()
    expect(icon()).toBe('/fleet-symbol-dark.svg')
    delete doc.documentElement.dataset.theme
    matches = false
    observerCb?.()
    expect(icon()).toBe('/fleet-symbol-light.svg')
    stop()
    expect(disconnected).toBe(true)
    expect(listeners.has('change')).toBe(false)
  })

  it('names the document Fleet and points the tab icon at the symbol', () => {
    const html = text('web/index.html')
    expect(html).toContain('<title>Fleet</title>')
    expect(html).toContain('/fleet-symbol-light.svg')
    expect(html).toContain('/fleet-symbol-dark.svg')
    expect(html).not.toContain('walnut-icon.png')
    expect(html).not.toContain('Open Walnut')
  })

  it('serves the official symbol files from the public folder, copied from brand/svg', () => {
    for (const name of [
      'fleet-horizontal-light.svg',
      'fleet-horizontal-dark.svg',
      'fleet-symbol-light.svg',
      'fleet-symbol-dark.svg',
    ]) {
      expect(text(`web/public/${name}`)).toBe(text(`brand/svg/${name}`))
    }
    const light = text('brand/svg/fleet-symbol-light.svg')
    const dark = text('brand/svg/fleet-symbol-dark.svg')
    expect(light).toContain('fill="#12100C"')
    expect(dark).toContain('fill="#D7D2C8"')
    expect(light).toContain('fill="#F45B25"')
    expect(dark).toContain('fill="#F45B25"')
  })

  it('uses the Fleet symbol on the intent card', () => {
    const html = renderToStaticMarkup(createElement(FleetSymbol))
    expect(html).toContain('src="/fleet-symbol-light.svg"')
    expect(html).toContain('src="/fleet-symbol-dark.svg"')
    expect(html).not.toContain('walnut-icon')
  })

  it('labels the system card Fleet and leaves the update check sentence alone', () => {
    const html = renderToStaticMarkup(createElement(NotificationUpdateCard, {
      status,
      checking: false,
      onCheck: () => {},
    }))
    expect(html).toContain('notification-card-label">Fleet<')
    expect(html).not.toContain('notification-card-label">Open Walnut<')
    expect(html).toContain('Check for a newer Open Walnut')
  })

  it('shows Fleet as the focus dock visible label and leaves the Ask sentence on the cell', () => {
    const html = renderToStaticMarkup(createElement(DockVisibleLabel))
    expect(html).toBe('<span class="dock-chat-label">Fleet</span>')
    const src = text('web/src/components/dock/FocusDock.tsx')
    expect(src).toContain('title="Ask Walnut"')
    expect(src).toContain('aria-label="Ask Walnut"')
  })
})
