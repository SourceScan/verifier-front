import { NetworkProvider } from '@/contexts/NetworkContext'
import { theme } from '@/utils/theme'
import { ChakraProvider, cookieStorageManagerSSR } from '@chakra-ui/react'
import type { AppProps } from 'next/app'

import WebAnalytics from '@/components/Common/WebAnalytics'
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
      {process.env.NODE_ENV === 'production' &&
        process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' && <WebAnalytics />}
    </>
  )
}
