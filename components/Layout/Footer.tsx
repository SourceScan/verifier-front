import { useNetwork } from '@/contexts/NetworkContext'
import { API_REFERENCE_URL, DOCS_URL, GITHUB_URL, explorerHomeUrl } from '@/utils/urls'
import { Box, Flex, HStack, Link, Text, VisuallyHidden, useColorModeValue } from '@chakra-ui/react'
import Image from 'next/image'

export default function Footer() {
  const { network, networkConfig } = useNetwork()
  const filter = useColorModeValue('none', 'invert(1)')
  const links = [
    ['Docs', DOCS_URL],
    ['API reference', API_REFERENCE_URL],
    ['GitHub', GITHUB_URL],
    [`NearBlocks (${networkConfig.name})`, explorerHomeUrl(network)],
  ]
  return (
    <Box as="footer" borderTop="1px solid" borderColor="rule" mt={16}>
      <Flex maxW="1280px" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 5, md: 4 }} gap={{ base: 4, md: 6 }} direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }} fontSize="sm">
        <HStack spacing={2.5} color="muted">
          <Image src="/sourcescan.png" width={20} height={20} alt="" style={{ borderRadius: 4 }} />
          <Text>SourceScan</Text>
        </HStack>
        <HStack as="nav" aria-label="Resources" spacing={{ base: 4, md: 5 }} flexWrap="wrap" rowGap={2} ml={{ md: 'auto' }}>
          {links.map(([label, href]) => (
            <Link key={label} href={href} isExternal color="muted" _hover={{ color: 'ink' }}>
              {label}
              <VisuallyHidden> (opens in new tab)</VisuallyHidden>
            </Link>
          ))}
          <Image src="/near-logo.svg" width={56} height={34} alt="Built on NEAR" style={{ filter }} />
        </HStack>
      </Flex>
    </Box>
  )
}
