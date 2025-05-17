import { useNetwork } from '@/contexts/NetworkContext'

/**
 * For direct import, provide both network RPC URLs
 */
export const RPC_URLS = {
  testnet: 'https://rpc.testnet.near.org',
  mainnet: 'https://rpc.mainnet.near.org',
}

/**
 * Get the RPC URL for the specified network
 */
export const getRpcUrl = (network: 'testnet' | 'mainnet'): string => {
  return RPC_URLS[network]
}

/**
 * For backward compatibility - gets used by components not yet using the network context
 * Uses the default network from local storage or testnet if not found
 */
const rpc =
  typeof window !== 'undefined'
    ? RPC_URLS[
        localStorage.getItem('network') === 'mainnet' ? 'mainnet' : 'testnet'
      ]
    : RPC_URLS.testnet

export { rpc }

/**
 * Hook to get the current network's RPC URL
 */
export const useRpcUrl = (): string => {
  const { network } = useNetwork()
  return RPC_URLS[network]
}
