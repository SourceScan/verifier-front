import type { NetworkType } from '@/contexts/NetworkContext'

/**
 * Bounded, de-duplicated scheduler for deployed code hash reads. At most
 * MAX_IN_FLIGHT requests run at once, one entry is shared per network +
 * account, and queued entries are dropped as soon as no component needs them
 * (page change, row scrolled away, navigation). Registry rows reuse a
 * completed answer for TTL_MS; a `fresh` subscriber (the contract page) never
 * does, and its answer becomes the one later rows reuse.
 */

/** Deployed code hash, or null when the account has no code / does not exist. */
export type OnChainHash = string | null
export type FetchCodeHash = (_network: NetworkType, _accountId: string) => Promise<OnChainHash>

export const MAX_IN_FLIGHT = 4
const TTL_MS = 5 * 60 * 1000

interface Entry {
  key: string
  network: NetworkType
  accountId: string
  state: 'queued' | 'running' | 'done'
  at: number
  subscribers: number
  promise: Promise<OnChainHash>
  resolve: (_hash: OnChainHash) => void
  reject: (_error: unknown) => void
}

export function createCodeHashQueue(fetchCodeHash: FetchCodeHash) {
  const entries = new Map<string, Entry>()
  const queue: Entry[] = []
  let running = 0

  function pump() {
    while (running < MAX_IN_FLIGHT && queue.length > 0) {
      const entry = queue.shift() as Entry
      entry.state = 'running'
      running += 1
      fetchCodeHash(entry.network, entry.accountId)
        .then(entry.resolve, (error) => {
          // Never cache failures; a retry re-fetches.
          if (entries.get(entry.key) === entry) entries.delete(entry.key)
          entry.reject(error)
        })
        .finally(() => {
          entry.state = 'done'
          entry.at = Date.now()
          running -= 1
          pump()
        })
    }
  }

  /** Subscribe to the deployed hash of an account; call `release` when no longer needed. */
  function subscribe(network: NetworkType, accountId: string, options: { fresh?: boolean } = {}) {
    const key = `${network}:${accountId}`
    let entry = entries.get(key)
    if (entry && entry.state === 'done' && (options.fresh || Date.now() - entry.at > TTL_MS)) {
      entries.delete(key)
      entry = undefined
    }
    if (!entry) {
      let resolve: Entry['resolve'] = () => undefined
      let reject: Entry['reject'] = () => undefined
      const promise = new Promise<OnChainHash>((res, rej) => {
        resolve = res
        reject = rej
      })
      promise.catch(() => undefined) // a dropped entry may have no listener
      entry = { key, network, accountId, state: 'queued', at: Date.now(), subscribers: 0, promise, resolve, reject }
      entries.set(key, entry)
      queue.push(entry)
    }
    const current = entry
    current.subscribers += 1
    pump()

    let released = false
    return {
      promise: current.promise,
      release() {
        if (released) return
        released = true
        current.subscribers -= 1
        if (current.subscribers === 0 && current.state === 'queued') {
          const index = queue.indexOf(current)
          if (index !== -1) queue.splice(index, 1)
          if (entries.get(current.key) === current) entries.delete(current.key)
        }
      },
    }
  }

  return { subscribe }
}
