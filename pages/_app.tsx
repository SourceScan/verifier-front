import { NetworkProvider } from '@/contexts/NetworkContext'
import { theme } from '@/utils/theme'
import { ChakraProvider, cookieStorageManagerSSR } from '@chakra-ui/react'
import type { AppProps } from 'next/app'

import Layout from '@/components/Layout/Layout'
import NextNProgress from 'nextjs-progressbar'

export default function App({ Component, pageProps }: AppProps) {
  const { cookies } = pageProps
  const colorModeManager = cookieStorageManagerSSR(cookies)

  return (
    <>
      <NextNProgress showOnShallow={true} color={'gray'} />
      <ChakraProvider theme={theme} colorModeManager={colorModeManager}>
        <NetworkProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </NetworkProvider>
      </ChakraProvider>
    </>
  )
}
