import { NetworkType } from '@/contexts/NetworkContext'

/**
 * Checks whether an address is a valid NEAR implicit-style account:
 * - NEAR implicit account: 64 lowercase hex characters
 * - ETH implicit account: 0x + 40 lowercase hex characters
 * - NEAR deterministic account: 0s + 40 lowercase hex characters
 */
export const isImplicitAccount = (address: string): boolean => {
  if (!address) return false
  return (
    /^[0-9a-f]{64}$/.test(address) ||
    /^0x[0-9a-f]{40}$/.test(address) ||
    /^0s[0-9a-f]{40}$/.test(address)
  )
}

/**
 * Detects the network type from a contract address based on its TLD.
 * Returns null for implicit/deterministic accounts since they can exist on either network.
 */
export const detectNetworkFromAddress = (
  contractAddress: string
): NetworkType | null => {
  if (!contractAddress) return null

  if (contractAddress.endsWith('.near')) {
    return 'mainnet'
  } else if (contractAddress.endsWith('.testnet')) {
    return 'testnet'
  }

  // Implicit and deterministic accounts can exist on either network
  return null
}

/**
 * Checks if a contract address is a valid NEAR account identifier.
 * Accepts named accounts (.near/.testnet) and implicit/deterministic accounts.
 */
export const isValidNearAccount = (contractAddress: string): boolean => {
  if (!contractAddress) return false
  return (
    contractAddress.endsWith('.near') ||
    contractAddress.endsWith('.testnet') ||
    isImplicitAccount(contractAddress)
  )
}
