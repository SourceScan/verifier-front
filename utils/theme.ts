import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

/**
 * "Verification report" direction: paper-white canvas, graphite ink, one cyan
 * signal colour taken from the SourceScan mark, and a distinct tint + border +
 * icon per verdict. Text tokens keep >= 4.5:1 on canvas and surface.
 */
const config: ThemeConfig = { initialColorMode: 'light', useSystemColorMode: false }

// Named UI fonts come before `system-ui`, which some Linux setups map to a monospace face.
const sans =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Roboto, "Helvetica Neue", Arial, "Liberation Sans", system-ui, sans-serif'
const mono =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const color = { light: '#17181c', dark: '#e8eaed' }
const bg = { light: '#fafaf9', dark: '#0c0e11' }

const token = (light: string, dark: string) => ({ default: light, _dark: dark })

export const HEADER_H = 56

const theme = extendTheme({
  config,
  fonts: { heading: sans, body: sans, mono },
  semanticTokens: {
    colors: {
      ink: token(color.light, color.dark),
      canvas: token(bg.light, bg.dark),
      surface: token('#ffffff', '#14171b'),
      sunken: token('#f5f5f4', '#101317'),
      muted: token('#57534e', '#a1a7b0'),
      faint: token('#78716c', '#868e99'),
      rule: token('#e7e5e4', '#262a30'),
      ruleStrong: token('#d6d3d1', '#353a42'),
      subtle: token('#f5f5f4', '#1a1e23'),
      accent: token('#0e7490', '#67d4ea'),
      accentHover: token('#155e75', '#a5e9f5'),
      accentSubtle: token('#ecfeff', '#0b2a31'),
      onAccent: token('#ffffff', '#0c0e11'),
      'status.ok': token('#166534', '#6ee7a1'),
      'status.okBg': token('#f0fdf4', '#0f2418'),
      'status.okBorder': token('#bbf7d0', '#1d4a30'),
      'status.bad': token('#991b1b', '#fca5a5'),
      'status.badBg': token('#fef2f2', '#2a1313'),
      'status.badBorder': token('#fecaca', '#5a2323'),
      'status.warn': token('#854d0e', '#fcd34d'),
      'status.warnBg': token('#fefce8', '#272010'),
      'status.warnBorder': token('#fde68a', '#4d3f14'),
    },
  },
  shadows: { outline: '0 0 0 3px rgba(14, 116, 144, 0.45)' },
  styles: {
    global: {
      html: { scrollPaddingTop: `${HEADER_H + 12}px` },
      body: { bg: 'canvas', color: 'ink', WebkitFontSmoothing: 'antialiased' },
      'th, h1, h2, h3': { letterSpacing: 0 },
    },
  },
  components: {
    Link: { baseStyle: { color: 'accent', _hover: { color: 'accentHover' } } },
    Button: {
      variants: {
        brand: {
          bg: 'accent',
          color: 'onAccent',
          _hover: { bg: 'accentHover', _disabled: { bg: 'accent' } },
          _active: { bg: 'accentHover' },
        },
        quiet: {
          bg: 'surface',
          color: 'ink',
          border: '1px solid',
          borderColor: 'ruleStrong',
          _hover: { bg: 'subtle' },
          _active: { bg: 'subtle' },
        },
      },
    },
  },
})

export { bg, color, theme }
