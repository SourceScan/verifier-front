/**
 * Client navigation bookkeeping for deliberate focus and scroll:
 * - pages focus their heading only after an in-app navigation (not on first load);
 * - each history entry remembers its scroll position, so Back/Forward can
 *   restore the registry once its rows are rendered (the browser's automatic
 *   restoration runs before async rows exist, so it is turned off in _app).
 */
let navigations = 0
export const markClientNavigation = () => {
  navigations += 1
}
export const hasClientNavigated = () => navigations > 0

const entryKey = () => {
  if (typeof window === 'undefined') return 'ssr'
  const key = (window.history.state as { key?: string } | null)?.key
  return key || `url:${window.location.pathname}${window.location.search}`
}

export const historyEntry = entryKey

export function saveScroll() {
  try {
    sessionStorage.setItem(`ss:y:${entryKey()}`, String(Math.round(window.scrollY)))
  } catch {
    // storage unavailable (private mode, quota): restoration simply does not happen
  }
}

export function readScroll(): number | null {
  try {
    const value = sessionStorage.getItem(`ss:y:${entryKey()}`)
    return value === null ? null : Number(value)
  } catch {
    return null
  }
}

/** Registry URL the user came from, for the workspace's "Verified contracts" link. */
export function rememberRegistryUrl(url: string) {
  try {
    sessionStorage.setItem('ss:registry', url)
  } catch {
    // ignore
  }
}
export function registryUrl(): string {
  try {
    return sessionStorage.getItem('ss:registry') || '/'
  } catch {
    return '/'
  }
}
