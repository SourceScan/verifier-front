import { useEffect, useState } from 'react'

function useWallet() {
  const [loading, setLoading] = useState<boolean>(false)
  const [selector] = useState<any>(null)
  const [wallet] = useState<any>(null)
  const [account] = useState<string | null>(null)
  const [publicKey] = useState<string | null>(null)

  useEffect(() => {
    // Wallet functionality has been removed
    setLoading(false)
  }, [])

  return { selector, wallet, account, publicKey, loading }
}

export { useWallet }
