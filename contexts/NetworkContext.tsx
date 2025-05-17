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
    accentColor: '#D49212', // Slightly darker amber for accent elements
    textColor: '#FFFFFF',
    rpcUrl: 'https://rpc.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
  },
  mainnet: {
    name: 'Mainnet',
    contract:
      process.env.NEXT_PUBLIC_CONTRACT_MAINNET || 'v2-verifier.sourcescan.near',
    backgroundColor: '#228B22', // Forest green that matches the theme
    accentColor: '#1B7A1B', // Slightly darker green for accent elements
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
  // Always initialize with the default for SSR compatibility
  const [network, setNetworkState] = useState<NetworkType>(DEFAULT_NETWORK)

  // Client-side only: Update network from localStorage after mount
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true on component mount to indicate we're in the browser
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Only run this effect after the component has mounted on the client
  useEffect(() => {
    if (!isClient) return

    try {
      // Get saved network from localStorage
      const savedNetwork = localStorage.getItem('network') as NetworkType

      // Only update if valid network and different from current
      if (savedNetwork && Object.keys(NETWORKS).includes(savedNetwork)) {
        setNetworkState(savedNetwork)
      } else if (!savedNetwork) {
        // If no network is saved in localStorage, initialize with default
        localStorage.setItem('network', DEFAULT_NETWORK)
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error)
    }
  }, [isClient])

  // Set default if not already set
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || typeof localStorage === 'undefined')
      return

    try {
      // If no network is saved in localStorage, initialize it with the current state
      if (!localStorage.getItem('network')) {
        localStorage.setItem('network', network)
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error)
    }
  }, [network])

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
