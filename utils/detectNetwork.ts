import type { NetworkType } from '@/contexts/NetworkContext'

/**
 * Matches the same account-id shape accepted by the verifier backend.
 * This includes named accounts, 64-character implicit accounts, and
 * 0x/0s-prefixed deterministic account strings.
 */
export const NEAR_ACCOUNT_ID_PATTERN =
  /^(?=.{2,64}$)(?:(?:[a-z0-9]+[-_])*[a-z0-9]+\.)*(?:[a-z0-9]+[-_])*[a-z0-9]+$/

export const isValidNearAccount = (accountId: string): boolean => {
  if (!accountId) return false
  return NEAR_ACCOUNT_ID_PATTERN.test(accountId)
}

/**
 * Detects the network type from a contract address based on its TLD.
 * Returns null for implicit/deterministic accounts since they can exist on either network.
 */
export const detectNetworkFromAddress = (
  contractAddress: string
): NetworkType | null => {
  if (!isValidNearAccount(contractAddress)) return null

  if (contractAddress.endsWith('.near')) {
    return 'mainnet'
  } else if (contractAddress.endsWith('.testnet')) {
    return 'testnet'
  }

  // Implicit and deterministic accounts can exist on either network
  return null
}
