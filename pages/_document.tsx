import { theme } from '@/utils/theme'
import { ColorModeScript } from '@chakra-ui/react'
import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="referrer" content="strict-origin" />
        <link rel="icon" href="/sourcescan.png" type="image/png" />
      </Head>
      <body>
        {/* Applies a saved colour mode before first paint (no light flash in dark mode). */}
        <ColorModeScript initialColorMode={theme.config.initialColorMode} type="cookie" />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
