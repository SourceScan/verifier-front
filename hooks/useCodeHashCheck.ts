import type { NetworkType } from '@/contexts/NetworkContext'
import { isNearCodeHash, viewCode } from '@/utils/near/view'
import { useCallback, useEffect, useMemo, useState } from 'react'

export type HashStatus = 'checking' | 'match' | 'mismatch' | 'no_code' | 'unavailable'

export interface HashCheck {
  status: HashStatus
  onChainHash?: string
  blockHeight?: number
}

const CHECKING: HashCheck = { status: 'checking' }

/** Each visit and retry compares against a fresh view of the deployed code. */
export function useCodeHashCheck(network: NetworkType, accountId: string, codeHash?: string) {
  const [attempt, setAttempt] = useState(0)
  const request = useMemo(() => ({ network, accountId, codeHash, attempt }), [network, accountId, codeHash, attempt])
  const [result, setResult] = useState<{ request: typeof request; check: HashCheck }>()

  useEffect(() => {
    if (request.codeHash === undefined) return
    const controller = new AbortController()
    // Strict Mode can run setup and cleanup once before the real setup.
    // Wait for cleanup before sending any request from the first setup.
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      viewCode(request.network, request.accountId, controller.signal)
        .then(({ hash, blockHeight }) => {
          if (controller.signal.aborted) return
          let status: HashStatus = 'unavailable'
          if (hash === null) status = 'no_code'
          else if (isNearCodeHash(request.codeHash)) status = hash === request.codeHash ? 'match' : 'mismatch'
          setResult({ request, check: { status, onChainHash: hash ?? undefined, blockHeight } })
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ request, check: { status: 'unavailable' } })
        })
    })
    return () => controller.abort()
  }, [request])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  // Hide the previous verdict during render, before effect cleanup handles the old request.
  return { check: result?.request === request ? result.check : CHECKING, retry }
}
