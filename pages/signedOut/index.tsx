import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@chakra-ui/react'
import { keyStores } from 'near-api-js'
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
        title: 'Key deleted',
        description: 'Key was successfully deleted',
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
          props.query?.errorCode || 'There was an error deleting your key',
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
          wallet.signOut()
          const browserKeyStore = new keyStores.BrowserLocalStorageKeyStore()
          browserKeyStore.removeKey(
            process.env.NEXT_PUBLIC_NETWORK || '',
            account
          )
        }

        router.push(props.query.redirectUri || '/')
      }
    }
  }, [wallet, account, result])

  return (
    <>
      <PageHead title={'Signed out'} />
    </>
  )
}
