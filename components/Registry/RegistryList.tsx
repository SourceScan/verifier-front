import { RowHashStatus } from '@/components/Contracts/HashStatus'
import type { RegistryPage } from '@/hooks/useRegistry'
import { workspaceHref } from '@/utils/urls'
import { Box, Flex, Link, Skeleton, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

const ROW_H = '52px'

/**
 * Quiet registry list: one row per contract, one DOM for every width (so no
 * hidden duplicate layout ever requests on-chain checks). Status checks start
 * only for rows on or near screen.
 */
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
          <RowHashStatus network={page.network} accountId={accountId} codeHash={data.code_hash} />
          <Text as="span" fontSize="xs" color="faint" fontFamily="mono" flexShrink={0} w={{ md: '104px' }} textAlign={{ md: 'right' }} title="Block height recorded with the verification">
            #{data.block_height}
          </Text>
        </Flex>
      ))}
    </Box>
  )
}

/** First-load placeholder with exactly the rows that will replace it. */
export function RegistryListSkeleton(props: { rows: number }) {
  return (
    <Box aria-hidden border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden">
      {Array.from({ length: props.rows }).map((_, i) => (
        <Flex key={i} h={ROW_H} px={4} align="center" gap={4} borderTop={i ? '1px solid' : undefined} borderColor="rule">
          <Skeleton h="12px" w={`${30 + ((i * 23) % 35)}%`} />
          <Skeleton h="18px" w="120px" rounded="full" ml="auto" />
        </Flex>
      ))}
    </Box>
  )
}
