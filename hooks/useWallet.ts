import { setupWalletSelector } from '@near-wallet-selector/core'
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet'
import { setupNearWallet } from '@near-wallet-selector/near-wallet'
import { useEffect, useState } from 'react'

function useWallet() {
  const [loading, setLoading] = useState<boolean>(true)
  const [selector, setSelector] = useState<any>(null)
  useEffect(() => {
    const load = async () => {
      const selector = await setupWalletSelector({
        network:
          process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
        modules: [setupNearWallet(), setupMyNearWallet()],
      })

      setSelector(selector)
    }

    load()
  }, [])

  const [wallet, setWallet] = useState<any>(null)
  useEffect(() => {
    const load = async () => {
      try {
        setWallet(await selector.wallet())
      } catch {
        setWallet(null)
      }
    }

    selector && load()
  }, [selector])

  const [account, setAccount] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  useEffect(() => {
    const loadAsync = async () => {
      const accounts = await wallet.getAccounts()
      setAccount(accounts[0].accountId)
      setPublicKey(accounts[0].publicKey)
      setLoading(false)
    }
    wallet && loadAsync()

    !wallet && selector && setLoading(false)
  }, [wallet, selector])

  return { selector, wallet, account, publicKey, loading }
}

export { useWallet }
