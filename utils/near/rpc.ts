import { useNetwork } from '@/contexts/NetworkContext'

/**
 * For direct import, provide both network RPC URLs
 * Using local API proxy to avoid CORS issues
 */
export const RPC_URLS = {
  testnet: '/api/proxy-rpc',
  mainnet: '/api/proxy-rpc',
}

/**
 * Get the RPC URL for the specified network
 */
export const getRpcUrl = (network: 'testnet' | 'mainnet'): string => {
  return RPC_URLS[network]
}

// Get network from localStorage with fallback to testnet
const getNetworkFromStorage = (): 'testnet' | 'mainnet' => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const savedNetwork = localStorage.getItem('network')
      if (savedNetwork === 'testnet' || savedNetwork === 'mainnet') {
        return savedNetwork
      }
    } catch (e) {
      console.warn('Failed to access localStorage:', e)
    }
  }
  return 'testnet'
}

// Use a function to get the latest network value
let cachedNetwork = getNetworkFromStorage()

// Update cached network when localStorage changes
if (typeof window !== 'undefined') {
  // Initial sync on page load
  cachedNetwork = getNetworkFromStorage()

  // Listen for storage events (changes from other tabs)
  window.addEventListener('storage', (event) => {
    if (
      event.key === 'network' &&
      (event.newValue === 'testnet' || event.newValue === 'mainnet')
    ) {
      cachedNetwork = event.newValue as 'testnet' | 'mainnet'
    }
  })

  // Additional check when localStorage is modified directly in this tab
  const originalSetItem = localStorage.setItem
  localStorage.setItem = function (key, value) {
    const result = originalSetItem.apply(this, arguments as any)
    if (key === 'network' && (value === 'testnet' || value === 'mainnet')) {
      cachedNetwork = value
    }
    return result
  }
}

/**
 * For backward compatibility - gets used by components not yet using the network context
 * Uses the cached network value to avoid direct localStorage access during rendering
 *
 * NOTE: This should not be used directly in components. Use useRpcUrl() hook instead.
 * This is kept for backward compatibility only.
 */
const rpc = RPC_URLS[cachedNetwork]

export { rpc }

/**
 * Hook to get the current network's RPC URL
 */
export const useRpcUrl = (): string => {
  const { network } = useNetwork()
  return RPC_URLS[network]
}
