import type { RegistryPage } from '@/hooks/useRegistry'
import { verificationLabel } from '@/utils/contracts'
import { workspaceHref } from '@/utils/urls'
import { Box, Flex, Link, Skeleton, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

const ROW_H = { base: '60px', md: '52px' }

/** Historical verification records in a single responsive list. */
export default function RegistryList(props: { page: RegistryPage; busy: boolean; label: string }) {
  const { page } = props
  return (
    <Box as="ol" aria-label={props.label} aria-busy={props.busy} listStyleType="none" border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden" opacity={props.busy ? 0.55 : 1} transition="opacity 120ms">
      {page.contracts.map(([accountId, data], i) => (
        <Flex as="li" key={accountId} minH={ROW_H} px={4} py={2} columnGap={3} rowGap={1} align="center" wrap={{ base: 'wrap', md: 'nowrap' }} borderTop={i ? '1px solid' : undefined} borderColor="rule" _hover={{ bg: 'subtle' }}>
          <Link
            as={NextLink}
            href={workspaceHref(accountId, { network: page.network })}
            title={accountId}
            fontFamily="mono"
            fontSize="14px"
            fontWeight="500"
            flex={{ base: '1 1 100%', md: '1 1 auto' }}
            minW={0}
            wordBreak={{ base: 'break-all', md: 'normal' }}
            overflow={{ md: 'hidden' }}
            textOverflow={{ md: 'ellipsis' }}
            whiteSpace={{ md: 'nowrap' }}
          >
            {accountId}
          </Link>
          <Text as="span" fontSize="xs" color="muted" flexShrink={0}>
            {verificationLabel(data.block_height)}
          </Text>
        </Flex>
      ))}
    </Box>
  )
}

/** First-load placeholder with the same row layout as the records. */
export function RegistryListSkeleton(props: { rows: number }) {
  return (
    <Box aria-hidden border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden">
      {Array.from({ length: props.rows }).map((_, i) => (
        <Flex key={i} h={ROW_H} px={4} align={{ base: 'flex-start', md: 'center' }} justify="center" direction={{ base: 'column', md: 'row' }} columnGap={3} rowGap={1} borderTop={i ? '1px solid' : undefined} borderColor="rule">
          <Skeleton h="12px" w={`${30 + ((i * 23) % 35)}%`} />
          <Skeleton h="12px" w="120px" ml={{ md: 'auto' }} />
        </Flex>
      ))}
    </Box>
  )
}
