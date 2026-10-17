/** Official Fleet marks. The files under brand/svg are copied into web/public; nothing here redraws them. */

export const FLEET_TITLE = 'Fleet'

export const FLEET_LOGO = {
  light: '/fleet-horizontal-light.svg',
  dark: '/fleet-horizontal-dark.svg',
  width: 84,
  height: 31,
} as const

export function fleetSymbolHref(dark: boolean): string {
  return dark ? '/fleet-symbol-dark.svg' : '/fleet-symbol-light.svg'
}

/** The browser tab icon follows the theme. A page with no icon link is left alone. */
export function syncTabIcon(doc: Document, dark: boolean): void {
  const link = doc.querySelector('link[rel="icon"]')
  if (!link) return
  link.setAttribute('href', fleetSymbolHref(dark))
}

/** A stored dark or light theme wins. With no stored theme, the operating system decides. */
export function tabIconIsDark(theme: string | undefined, osDark: boolean): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return osDark
}

type TabView = Pick<Window, 'matchMedia'> & { MutationObserver: typeof MutationObserver }

/** Keep the tab icon on the theme the page already writes onto the document. */
export function watchTabIcon(doc: Document, view: TabView): () => void {
  const query = '(prefers-color-scheme: dark)'
  const paint = () => {
    syncTabIcon(doc, tabIconIsDark(doc.documentElement.dataset.theme, view.matchMedia(query).matches))
  }
  const mql = view.matchMedia(query)
  mql.addEventListener('change', paint)
  const obs = new view.MutationObserver(paint)
  obs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  paint()
  return () => {
    mql.removeEventListener('change', paint)
    obs.disconnect()
  }
}

/** The symbol alone, light and dark. CSS shows the one that matches the theme. */
export function FleetSymbol() {
  return (
    <>
      <img src="/fleet-symbol-light.svg" alt="" className="draft-intent-walnut-mark fleet-mark-light" />
      <img src="/fleet-symbol-dark.svg" alt="" className="draft-intent-walnut-mark fleet-mark-dark" />
    </>
  )
}
