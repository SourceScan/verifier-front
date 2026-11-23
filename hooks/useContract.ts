import { NETWORKS, NetworkType, useNetwork } from '@/contexts/NetworkContext'
import { ContractData, isContractData } from '@/utils/contracts'
import { isRpcFailure } from '@/utils/near/response'
import { viewFunction } from '@/utils/near/view'
import { useCallback, useEffect, useState } from 'react'

const TTL_MS = 60 * 1000

/* ------------------------------------------------------------------ record */

const records = new Map<string, { at: number; data: ContractData | null }>()
const recordKey = (network: NetworkType, accountId: string) =>
  `${network}:${NETWORKS[network].contract}:${accountId}`

/** Registry record (`get_contract`), cached briefly so lookup -> workspace and Back are instant. */
export async function fetchContractRecord(
  network: NetworkType,
  accountId: string,
  signal?: AbortSignal
): Promise<ContractData | null> {
  const key = recordKey(network, accountId)
  const hit = records.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data
  const data = await viewFunction<unknown>(network, NETWORKS[network].contract, 'get_contract', { account_id: accountId }, signal)
  if (data !== null && !isContractData(data)) throw new Error('Unexpected registry record')
  records.set(key, { at: Date.now(), data })
  return data
}

const cachedRecord = (network: NetworkType, accountId: string) => {
  const hit = records.get(recordKey(network, accountId))
  return hit && Date.now() - hit.at < TTL_MS ? hit : null
}

export type RecordLoad =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error' }
  | { status: 'ready'; data: ContractData }

const fromData = (data: ContractData | null): RecordLoad =>
  data === null ? { status: 'not_found' } : { status: 'ready', data }

/** The verifier registry's record for `accountId` on the selected network. */
export function useContractRecord(accountId: string, enabled: boolean) {
  const { network } = useNetwork()
  const [state, setState] = useState<{ key: string; load: RecordLoad }>(() => {
    const hit = cachedRecord(network, accountId)
    return { key: `${network}:${accountId}`, load: hit ? fromData(hit.data) : { status: 'loading' } }
  })
  const [attempt, setAttempt] = useState(0)
  const key = `${network}:${accountId}`

  useEffect(() => {
    if (!enabled) return
    const hit = cachedRecord(network, accountId)
    if (hit) {
      setState({ key, load: fromData(hit.data) })
      return
    }
    const controller = new AbortController()
    setState({ key, load: { status: 'loading' } })
    fetchContractRecord(network, accountId, controller.signal)
      .then((data) => !controller.signal.aborted && setState({ key, load: fromData(data) }))
      .catch(() => !controller.signal.aborted && setState({ key, load: { status: 'error' } }))
    return () => controller.abort()
  }, [enabled, network, accountId, key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  // Never hand out a record that belongs to another network/account.
  return { load: state.key === key ? state.load : ({ status: 'loading' } as RecordLoad), retry }
}

/* ---------------------------------------------------------------- metadata */

export interface SourceMetadata {
  version?: string
  link?: string
  standards?: { standard: string; version: string }[]
  build_info?: {
    build_environment?: string
    build_command?: string[]
    contract_path?: string
    source_code_snapshot?: string
  }
}

export type MetadataLoad =
  | { status: 'loading' }
  | { status: 'missing' } // contract does not expose contract_source_metadata
  | { status: 'error' }
  | { status: 'ready'; metadata: SourceMetadata }

const metadataCache = new Map<string, { at: number; load: MetadataLoad }>()

/** NEP-330 `contract_source_metadata` read from the contract itself. */
export function useSourceMetadata(accountId: string, enabled: boolean) {
  const { network } = useNetwork()
  const key = `${network}:${accountId}`
  const [state, setState] = useState<{ key: string; load: MetadataLoad }>({ key, load: { status: 'loading' } })

  useEffect(() => {
    if (!enabled) return
    const hit = metadataCache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS) {
      setState({ key, load: hit.load })
      return
    }
    const controller = new AbortController()
    setState({ key, load: { status: 'loading' } })
    viewFunction<SourceMetadata>(network, accountId, 'contract_source_metadata', undefined, controller.signal)
      .then((metadata): MetadataLoad => (metadata && typeof metadata === 'object' ? { status: 'ready', metadata } : { status: 'missing' }))
      .catch((error): MetadataLoad => (isRpcFailure(error) && error.kind !== 'unavailable' ? { status: 'missing' } : { status: 'error' }))
      .then((load) => {
        if (controller.signal.aborted) return
        if (load.status !== 'error') metadataCache.set(key, { at: Date.now(), load })
        setState({ key, load })
      })
    return () => controller.abort()
  }, [enabled, network, accountId, key])

  return state.key === key ? state.load : ({ status: 'loading' } as MetadataLoad)
}
