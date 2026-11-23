import type { NetworkType } from '@/contexts/NetworkContext'
import { subscribeCodeHash } from '@/utils/near/codeHashQueue'
import { useEffect, useState } from 'react'

/**
 * Compares the code hash recorded by the verifier with the code currently
 * deployed on-chain. Every status is reported as what it is: an RPC failure
 * is "unavailable", never a mismatch.
 */
export type HashStatus = 'checking' | 'match' | 'mismatch' | 'no_code' | 'unavailable'

export interface HashCheck {
  status: HashStatus
  onChainHash?: string
}

/**
 * With `whenVisible`, the check starts only while the returned `ref` element
 * is on (or near) screen, so hidden layouts and off-screen rows cost nothing.
 */
export function useCodeHashCheck(
  network: NetworkType,
  accountId: string,
  codeHash: string | undefined,
  options: { whenVisible?: boolean; attempt?: number } = {}
) {
  const { whenVisible = false, attempt = 0 } = options
  const [check, setCheck] = useState<HashCheck>({ status: 'checking' })
  const [node, setNode] = useState<Element | null>(null)
  const [visible, setVisible] = useState(!whenVisible)

  useEffect(() => {
    if (!whenVisible || !node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (items) => setVisible(items.some((item) => item.isIntersecting)),
      { rootMargin: '200px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [whenVisible, node])

  useEffect(() => {
    setCheck({ status: 'checking' })
  }, [network, accountId, codeHash, attempt])

  useEffect(() => {
    if (!codeHash || !visible) return
    let active = true
    const subscription = subscribeCodeHash(network, accountId)
    subscription.promise.then(
      (hash) => {
        if (!active) return
        setCheck(
          hash === null
            ? { status: 'no_code' }
            : { status: hash === codeHash ? 'match' : 'mismatch', onChainHash: hash }
        )
      },
      () => active && setCheck({ status: 'unavailable' })
    )
    return () => {
      active = false
      subscription.release()
    }
  }, [network, accountId, codeHash, visible, attempt])

  return { check, ref: setNode }
}
