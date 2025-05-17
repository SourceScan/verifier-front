import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

// Define available networks
export type NetworkType = 'testnet' | 'mainnet'

// Network configuration
export const NETWORKS = {
  testnet: {
    name: 'Testnet',
    contract:
      process.env.NEXT_PUBLIC_CONTRACT_TESTNET ||
      'v2-verifier.sourcescan.testnet',
    backgroundColor: '#E8A317', // Darker amber that matches the theme
    textColor: '#FFFFFF',
    rpcUrl: 'https://rpc.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
  },
  mainnet: {
    name: 'Mainnet',
    contract:
      process.env.NEXT_PUBLIC_CONTRACT_MAINNET || 'v2-verifier.sourcescan.near',
    backgroundColor: '#228B22', // Forest green that matches the theme
    textColor: '#FFFFFF',
    rpcUrl: 'https://rpc.mainnet.near.org',
    explorerUrl: 'https://explorer.near.org',
  },
}

// Default network
const DEFAULT_NETWORK: NetworkType = 'testnet'

interface NetworkContextType {
  network: NetworkType
  networkConfig: typeof NETWORKS.testnet
  setNetwork: (_network: NetworkType) => void
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Always initialize with the default network from env for SSR compatibility
  const [network, setNetworkState] = useState<NetworkType>(DEFAULT_NETWORK)

  // For client-side updates without hydration issues
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || typeof localStorage === 'undefined')
      return

    try {
      // Get saved network from localStorage
      const savedNetwork = localStorage.getItem('network') as NetworkType

      // Only update if valid network and different from current
      if (
        savedNetwork &&
        Object.keys(NETWORKS).includes(savedNetwork) &&
        savedNetwork !== network
      ) {
        setNetworkState(savedNetwork)
      } else if (!savedNetwork) {
        // If no network is saved in localStorage, initialize it with the default
        localStorage.setItem('network', DEFAULT_NETWORK)
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error)
      // If there's an error, ensure we have a fallback
      try {
        localStorage.setItem('network', DEFAULT_NETWORK)
      } catch (e) {
        console.error('Failed to initialize localStorage:', e)
      }
    }
  }, []) // Remove network dependency to avoid circular updates

  // Save network preference to localStorage when it changes
  const setNetwork = (newNetwork: NetworkType) => {
    // Update state
    setNetworkState(newNetwork)

    // Save to localStorage if in browser
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('network', newNetwork)
      } catch (error) {
        console.warn('Failed to save network preference:', error)
      }
    }
  }

  // Get current network configuration (always valid)
  const networkConfig = NETWORKS[network]

  return (
    <NetworkContext.Provider value={{ network, networkConfig, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  )
}

// Custom hook for using the network context
export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext)
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider')
  }
  return context
}
