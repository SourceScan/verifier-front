import { NetworkType, useNetwork } from '@/contexts/NetworkContext'
import {
  detectNetworkFromAddress,
  isValidNearAccount,
} from '@/utils/detectNetwork'
import { useEffect, useRef } from 'react'

export type AccountNetworkState = 'pending' | 'invalid' | 'unknown_network' | 'ready'

/**
 * Reads a `?network=` link value: a network, `undefined` when the link has
 * none, or `null` when it names something that is not a NEAR network.
 */
export function parseNetworkParam(value: string | undefined): NetworkType | null | undefined {
  if (value === undefined || value === '') return undefined
  const v = value.trim().toLowerCase()
  return v === 'mainnet' || v === 'testnet' ? v : null
}

/**
 * Picks the network an account page reads from:
 * `.near` / `.testnet` accounts always use their own network (a `?network=`
 * on them is ignored); implicit and deterministic accounts use the link's
 * `?network=` when present, otherwise the saved selection. An implicit or
 * deterministic account with an unrecognised `?network=` is 'unknown_network'
 * and must not be read from any network.
 *
 * The selector is switched once per (account, link network) pair, so changing
 * only `?network=` on the same account ("Check Testnet", Back/Forward) switches
 * again without a reload, while a manual switch on the page (which navigates
 * home) is never overridden.
 * Pages must not fetch until this is 'ready', so no request ever goes to the
 * wrong network while the saved preference or a switch is still pending.
 */
export function useAccountNetwork(
  accountId: string | undefined,
  networkParam: string | undefined
): AccountNetworkState {
  const { network, setNetwork, isReady } = useNetwork()
  const valid = !!accountId && isValidNearAccount(accountId)
  const inferred = valid ? detectNetworkFromAddress(accountId as string) : null
  const requested = parseNetworkParam(networkParam)
  const unknown = valid && !inferred && requested === null
  const target: NetworkType | null = inferred ?? requested ?? null
  const key = valid && !unknown ? `${accountId}|${target ?? ''}` : null
  const appliedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!isReady || !key || appliedFor.current === key) return
    appliedFor.current = key
    if (target && target !== network) setNetwork(target)
  }, [isReady, key, target, network, setNetwork])

  if (!accountId) return 'pending'
  if (!valid) return 'invalid'
  if (unknown) return 'unknown_network'
  if (!isReady) return 'pending'
  // Waiting for the switch above, or the reader switched networks and the
  // selector is navigating home.
  if (target && target !== network) return 'pending'
  return 'ready'
}
