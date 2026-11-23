import { useNetwork } from '@/contexts/NetworkContext'
import { HEADER_H } from '@/utils/theme'
import { API_REFERENCE_URL, DOCS_URL, GITHUB_URL, explorerHomeUrl } from '@/utils/urls'
import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  VisuallyHidden,
  useColorMode,
} from '@chakra-ui/react'
import Image from 'next/image'
import NextLink from 'next/link'
import { FiArrowUpRight, FiMenu, FiMoon, FiSun } from 'react-icons/fi'
import NetSelector from './NetSelector'

// Below 375px the header tightens; below 360px the wordmark is visually hidden
// (it stays the link's accessible name) so the selector, theme and menu fit.
const NARROW = '@media (max-width: 374.98px)'
const NARROWEST = '@media (max-width: 359.98px)'
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export default function Navbar() {
  const { network, networkConfig } = useNetwork()
  const { colorMode, toggleColorMode } = useColorMode()
  const themeLabel = colorMode === 'dark' ? 'Use light theme' : 'Use dark theme'
  const links = [
    { label: 'NearBlocks', long: `NearBlocks (${networkConfig.name})`, href: explorerHomeUrl(network), title: `NearBlocks ${networkConfig.name} explorer` },
    { label: 'Docs', long: 'Docs', href: DOCS_URL, title: 'SourceScan documentation' },
    { label: 'API', long: 'API reference', href: API_REFERENCE_URL, title: 'SourceScan public API reference' },
    { label: 'GitHub', long: 'GitHub', href: GITHUB_URL, title: 'SourceScan on GitHub' },
  ]

  return (
    <Box as="header" position="sticky" top={0} zIndex={30} h={`${HEADER_H}px`} bg="surface" borderBottom="1px solid" borderBottomColor="rule">
      <Flex maxW="1280px" h="full" mx="auto" px={{ base: 4, md: 6 }} align="center" gap={3} minW={0} sx={{ [NARROW]: { px: 3, gap: 2 } }}>
        <Link as={NextLink} href="/" display="flex" alignItems="center" gap={2.5} color="ink" flexShrink={0} _hover={{ textDecoration: 'none', color: 'ink' }} sx={{ [NARROW]: { gap: 2 } }}>
          <Image src="/sourcescan.png" width={28} height={28} alt="" priority style={{ borderRadius: 6 }} />
          <Text as="span" fontSize="17px" fontWeight="700" letterSpacing="0" sx={{ [NARROW]: { fontSize: '16px' }, [NARROWEST]: visuallyHidden }}>
            SourceScan
          </Text>
        </Link>

        <HStack as="nav" aria-label="Resources" spacing={0.5} ml="auto" display={{ base: 'none', md: 'flex' }}>
          {links.map((l) => (
            <Link key={l.label} href={l.href} isExternal title={l.title} display="inline-flex" alignItems="center" gap={0.5} px={2.5} h="32px" rounded="md" fontSize="sm" fontWeight="500" color="muted" _hover={{ color: 'ink', bg: 'subtle', textDecoration: 'none' }}>
              {l.label}
              <Icon as={FiArrowUpRight} aria-hidden boxSize="13px" />
              <VisuallyHidden>{l.label === 'NearBlocks' ? ` ${networkConfig.name} explorer` : ''} (opens in new tab)</VisuallyHidden>
            </Link>
          ))}
        </HStack>

        <HStack spacing={1} ml={{ base: 'auto', md: 2 }}>
          <NetSelector />
          <Tooltip label={themeLabel}>
            <IconButton aria-label={themeLabel} variant="ghost" size="sm" icon={colorMode === 'dark' ? <FiSun /> : <FiMoon />} onClick={toggleColorMode} />
          </Tooltip>
          <Box display={{ base: 'block', md: 'none' }}>
            <Menu placement="bottom-end">
              <MenuButton as={IconButton} aria-label="Resources" icon={<FiMenu />} variant="ghost" size="sm" />
              <MenuList bg="surface" fontSize="sm" minW="220px">
                {links.map((l) => (
                  <MenuItem key={l.label} as="a" href={l.href} target="_blank" rel="noopener noreferrer" bg="surface" icon={<FiArrowUpRight />} title={l.title}>
                    {l.long}
                    <VisuallyHidden> (opens in new tab)</VisuallyHidden>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Box>
        </HStack>
      </Flex>
    </Box>
  )
}
