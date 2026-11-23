import { NetworkType } from '@/contexts/NetworkContext'
import { isValidNearAccount } from '@/utils/detectNetwork'

/**
 * verifier-contract `search(key)` lowercases every STORED account id and removes
 * ".testnet" and ".near" from it before `contains(key.to_lowercase())`, while
 * the key is only lowercased. A full id such as "sample.near" can therefore
 * never match. Applying the same stripping to the key gives the contract's own
 * semantics for partial input and makes full ids match too.
 */
export const contractSearchKey = (query: string) =>
  query.trim().toLowerCase().split('.testnet').join('').split('.near').join('')

export type QueryKind = 'named' | 'implicit' | 'deterministic' | 'bare' | 'partial'

/** How a typed query should be treated by the lookup. */
export function queryKind(query: string): QueryKind {
  const id = query.trim().toLowerCase()
  if (!id || !isValidNearAccount(id)) return 'partial'
  if (/^[0-9a-f]{64}$/.test(id)) return 'implicit'
  if (/^0[sx][0-9a-f]{40}$/.test(id)) return 'deterministic'
  if (id.endsWith('.near') || id.endsWith('.testnet')) return 'named'
  return 'bare' // e.g. "aurora": could be a top-level account or part of a name
}

/** Networks to try for an exact lookup, most likely first. */
export function lookupNetworks(query: string, current: NetworkType): NetworkType[] {
  const id = query.trim().toLowerCase()
  if (id.endsWith('.near')) return ['mainnet']
  if (id.endsWith('.testnet')) return ['testnet']
  const other: NetworkType = current === 'mainnet' ? 'testnet' : 'mainnet'
  const kind = queryKind(id)
  return kind === 'implicit' || kind === 'deterministic' ? [current, other] : [current]
}
