import { extendTheme } from '@chakra-ui/react'
import { GlobalStyleProps, mode } from '@chakra-ui/theme-tools'
import { Source_Code_Pro } from 'next/font/google'

const font = Source_Code_Pro({ subsets: ['latin'], display: 'swap' })

const color = { light: 'gray.700', dark: 'gray.100' }
const bg = { light: 'gray.100', dark: '#28282B' }

const styles = {
  global: (props: GlobalStyleProps) => ({
    body: {
      color: mode(color.light, color.dark)(props),
      bg: mode(bg.light, bg.dark)(props),
    },
  }),
}

const theme = extendTheme({
  fonts: {
    heading: font.style.fontFamily,
    body: font.style.fontFamily,
  },
  styles,
  initialColorMode: 'system',
  useSystemColorMode: true,
})

export { bg, color, theme }
