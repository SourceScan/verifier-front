import { inject, pageview } from '@vercel/analytics'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const publicRoutes = new Set(['/', '/contract/[slug]', '/code/[slug]', '/404'])

export default function WebAnalytics() {
  const { asPath, isReady, pathname } = useRouter()
  const visitedPath = asPath.split(/[?#]/, 1)[0]

  useEffect(() => {
    const referrer = document.referrer
    let discardFirstView = Boolean(referrer && referrer !== `${new URL(referrer).origin}/`)

    inject({
      framework: 'next',
      mode: 'production',
      disableAutoTrack: true,
      beforeSend(event) {
        if (event.type !== 'pageview') return null
        if (discardFirstView) {
          discardFirstView = false
          return null
        }

        const { pathname: eventPath } = new URL(event.url)
        const route = publicRoutes.has(eventPath) ? eventPath : '/404'
        return { ...event, url: `${window.location.origin}${route}` }
      },
    })

    // The script attaches document.referrer only to its first explicit pageview.
    // Cancel that view when the referrer contains more than its origin.
    if (discardFirstView) pageview({ path: '/' })
  }, [])

  useEffect(() => {
    if (!isReady) return

    const route = publicRoutes.has(pathname) ? pathname : '/404'
    pageview({ route, path: route })
  }, [isReady, pathname, visitedPath])

  return null
}
