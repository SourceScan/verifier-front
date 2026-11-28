import type { NetworkType } from '@/contexts/NetworkContext'
import type { ContractData } from '@/utils/contracts'
import type { RecordedSource } from '@/utils/evidence'
import { githubFromGitCheckout, isGithubDto } from '@/utils/extractGithub'
import { readSnapshotCheckout } from '@/utils/sourceFiles'
import { useCallback, useEffect, useState } from 'react'

/**
 * Repository and commit of the recorded snapshot: the record's own `github`
 * when it has one, otherwise the git checkout stored in the snapshot. The
 * snapshot is read only once `enabled` (a tab that shows it is open), and a
 * read that fails or times out is `unknown` with a retry.
 */
export function useRecordedSource(network: NetworkType, data: ContractData | null, enabled: boolean) {
  const recorded = data && isGithubDto(data.github) ? data.github : null
  const cid = data?.cid
  const key = `${network}:${cid}`
  const [state, setState] = useState<{ key: string; source: RecordedSource }>({ key, source: { status: 'loading' } })
  const [attempt, setAttempt] = useState(0)
  // Once a tab has asked for it, keep the read going across tab switches.
  const [wanted, setWanted] = useState(enabled)
  useEffect(() => {
    if (enabled) setWanted(true)
  }, [enabled])

  useEffect(() => {
    if (!cid || recorded || !wanted) return
    let active = true
    setState({ key, source: { status: 'loading' } })
    readSnapshotCheckout(network, cid)
      .then((checkout): RecordedSource => {
        if (!checkout) return { status: 'none', reason: 'no_checkout' }
        const github = githubFromGitCheckout(checkout.head, checkout.config)
        return github ? { status: 'known', github, origin: 'snapshot' } : { status: 'none', reason: 'unidentified' }
      })
      .catch((): RecordedSource => ({ status: 'unknown' }))
      .then((source) => active && setState({ key, source }))
    return () => {
      active = false
    }
  }, [network, cid, key, recorded, wanted, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const source: RecordedSource = recorded
    ? { status: 'known', github: recorded, origin: 'record' }
    : state.key === key
      ? state.source
      : { status: 'loading' }
  return { source, retry }
}
