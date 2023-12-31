import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@chakra-ui/react'
import { KeyPair, keyStores } from 'near-api-js'
import { NextPageContext } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import PageHead from '@/components/Common/PageHead'

SignedOut.getInitialProps = async (ctx: NextPageContext) => {
  const { query } = ctx

  return { query: query }
}

export default function SignedOut(props: { query: any }) {
  const { wallet, account } = useWallet()

  const [result, setResult] = useState<boolean | null>(null)

  const router = useRouter()
  const toast = useToast()

  useEffect(() => {
    if (props.query?.transactionHashes) {
      toast({
        title: 'Key added',
        description: 'Key was successfully added',
        status: 'success',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })

      setResult(true)
    }
    if (props.query?.errorCode) {
      toast({
        title: 'Error ocurred',
        description:
          props.query?.errorCode || 'There was an error adding your key',
        status: 'error',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })

      setResult(false)
    }
  }, [props.query])

  useEffect(() => {
    if (wallet && account) {
      if (result !== null) {
        if (result) {
          const accessKey = KeyPair.fromString(
            localStorage.getItem('pending_key') || ''
          )
          const browserKeyStore = new keyStores.BrowserLocalStorageKeyStore()
          browserKeyStore.setKey(
            process.env.NEXT_PUBLIC_NETWORK || '',
            account,
            accessKey
          )
        }

        localStorage.removeItem('pending_key')
        router.push(props.query.redirectUri || '/')
      }
    }
  }, [wallet, account, result])

  return (
    <>
      <PageHead title={'Key was added'} />
    </>
  )
}
