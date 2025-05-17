import { NetworkType } from '@/contexts/NetworkContext'

/**
 * Detects the network type from a contract address based on its TLD
 * @param contractAddress The contract address to analyze
 * @returns The detected network type or null if can't be determined
 */
export const detectNetworkFromAddress = (
  contractAddress: string
): NetworkType | null => {
  if (!contractAddress) return null

  // Check if the address ends with .near (mainnet) or .testnet (testnet)
  if (contractAddress.endsWith('.near')) {
    return 'mainnet'
  } else if (contractAddress.endsWith('.testnet')) {
    return 'testnet'
  }

  // If no specific TLD is found, return null
  return null
}
