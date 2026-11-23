import { NETWORKS, NetworkType, useNetwork } from '@/contexts/NetworkContext'
import { fetchContractRecord } from '@/hooks/useContract'
import { ContractData, ContractEntry, isContractEntry } from '@/utils/contracts'
import { viewFunction } from '@/utils/near/view'
import { contractSearchKey, lookupNetworks, queryKind } from '@/utils/registrySearch'
import { useCallback, useEffect, useState } from 'react'

export interface RegistryParams {
  search: string
  fromIndex: number
  limit: number
}

export interface RegistryPage {
  network: NetworkType
  params: RegistryParams
  contracts: ContractEntry[]
  pages: number
}

const TTL_MS = 60 * 1000
const pages = new Map<string, { at: number; page: RegistryPage }>()
const pageKey = (network: NetworkType, p: RegistryParams) =>
  `${network}|${NETWORKS[network].contract}|${contractSearchKey(p.search)}|${p.fromIndex}|${p.limit}`

async function fetchRegistryPage(network: NetworkType, params: RegistryParams, signal: AbortSignal): Promise<RegistryPage> {
  const key = contractSearchKey(params.search)
  const contract = NETWORKS[network].contract
  const result = key
    ? await viewFunction<unknown>(network, contract, 'search', { key, from_index: params.fromIndex, limit: params.limit }, signal)
    : await viewFunction<unknown>(network, contract, 'get_contracts', { from_index: params.fromIndex, limit: params.limit }, signal)
  if (!Array.isArray(result) || !Array.isArray(result[0])) throw new Error('Unexpected registry response')
  return { network, params, contracts: result[0].filter(isContractEntry), pages: Math.max(0, Number(result[1]) || 0) }
}

/**
 * A registry page. While the next page loads, the page on screen (with its own
 * network + params, so its label stays truthful) remains visible; it is never
 * shown under another network. Responses for superseded params are dropped.
 */
export function useRegistryPage(params: RegistryParams) {
  const { network, isReady } = useNetwork()
  const key = pageKey(network, params)
  const [shown, setShown] = useState<RegistryPage | null>(() => pages.get(key)?.page ?? null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isReady) return
    setFailedKey(null)
    const hit = pages.get(key)
    if (hit) setShown(hit.page)
    else setShown((prev) => (prev && prev.network === network ? prev : null))
    if (hit && Date.now() - hit.at < TTL_MS) {
      setPendingKey(null)
      return
    }
    const controller = new AbortController()
    setPendingKey(key)
    fetchRegistryPage(network, params, controller.signal)
      .then((page) => {
        pages.set(key, { at: Date.now(), page })
        if (controller.signal.aborted) return
        setShown(page)
        setPendingKey(null)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setPendingKey(null)
        setFailedKey(key)
      })
    return () => controller.abort()
    // params identity is captured by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const current = !!shown && pageKey(shown.network, shown.params) === key
  return {
    shown: shown && shown.network === network ? shown : null,
    current,
    pending: pendingKey === key,
    failed: failedKey === key,
    retry,
  }
}

export type RegistryCount =
  | { status: 'loading' }
  | { status: 'ready'; count: number }
  | { status: 'unavailable' }

const counts = new Map<string, { at: number; count: number }>()
const countKey = (network: NetworkType) => `${network}|${NETWORKS[network].contract}`

/** `get_contracts_count` returns a u64; accept a JSON number or a decimal string, nothing else. */
const parseCount = (value: unknown): number | null => {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : null
}

/**
 * Total verified contracts in the selected network's registry, read from the
 * contract's own `get_contracts_count` (not a page length or page estimate).
 * It does not depend on search or paging, and a count is only ever returned
 * for the network it was read from.
 */
export function useRegistryCount() {
  const { network, isReady } = useNetwork()
  const key = countKey(network)
  const [state, setState] = useState<{ key: string; value: RegistryCount }>(() => {
    const hit = counts.get(key)
    return { key, value: hit ? { status: 'ready', count: hit.count } : { status: 'loading' } }
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isReady) return
    const hit = counts.get(key)
    setState({ key, value: hit ? { status: 'ready', count: hit.count } : { status: 'loading' } })
    if (hit && Date.now() - hit.at < TTL_MS) return
    const controller = new AbortController()
    viewFunction<unknown>(network, NETWORKS[network].contract, 'get_contracts_count', undefined, controller.signal)
      .then((raw) => {
        const count = parseCount(raw)
        if (count === null) throw new Error('Unexpected registry count')
        counts.set(key, { at: Date.now(), count })
        if (!controller.signal.aborted) setState({ key, value: { status: 'ready', count } })
      })
      .catch(() => {
        // A failed refresh keeps this network's last known count.
        if (!controller.signal.aborted && !hit) setState({ key, value: { status: 'unavailable' } })
      })
    return () => controller.abort()
    // `key` captures the network and its registry contract
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const count: RegistryCount = isReady && state.key === key ? state.value : { status: 'loading' }
  return { count, retry }
}

export type ExactLookup =
  | { status: 'idle' }
  | { status: 'checking'; query: string }
  | { status: 'found'; query: string; accountId: string; network: NetworkType; data: ContractData }
  | { status: 'none'; query: string; accountId: string; networks: NetworkType[] }
  | { status: 'error'; query: string }

/** Exact registry lookup for an account-shaped query, across the networks it could be on. */
export async function lookupExact(query: string, current: NetworkType, signal?: AbortSignal): Promise<ExactLookup> {
  const accountId = query.trim().toLowerCase()
  const networks = lookupNetworks(accountId, current)
  try {
    for (const network of networks) {
      const data = await fetchContractRecord(network, accountId, signal)
      if (data) return { status: 'found', query, accountId, network, data }
    }
    return { status: 'none', query, accountId, networks }
  } catch {
    return { status: 'error', query }
  }
}

/** Runs `lookupExact` for the current `?search=` when it looks like an account id. */
export function useExactLookup(query: string) {
  const { network, isReady } = useNetwork()
  // Each answer remembers the network selection it was looked up from.
  const [state, setState] = useState<{ from: NetworkType | null; value: ExactLookup }>({ from: null, value: { status: 'idle' } })
  useEffect(() => {
    if (!isReady || !query || queryKind(query) === 'partial') {
      setState({ from: null, value: { status: 'idle' } })
      return
    }
    const controller = new AbortController()
    setState({ from: network, value: { status: 'checking', query } })
    lookupExact(query, network, controller.signal).then((result) => !controller.signal.aborted && setState({ from: network, value: result }))
    return () => controller.abort()
  }, [isReady, query, network])
  const { from, value } = state
  if (value.status === 'idle') return value
  // Never show an answer for another query or from before a network switch.
  return value.query !== query || from !== network ? ({ status: 'checking', query } as ExactLookup) : value
}
