import ExternalTextLink from '@/components/Common/ExternalTextLink'
import { RowHashStatus } from '@/components/Contracts/HashStatus'
import type { NetworkType } from '@/contexts/NetworkContext'
import type { ContractEntry } from '@/utils/contracts'
import { codePath, contractPath, explorerContractUrl } from '@/utils/urls'
import { Box, Flex, HStack, Link, Text, VisuallyHidden } from '@chakra-ui/react'
import NextLink from 'next/link'

/**
 * Compact registry list for small screens (< md). Same data as the table;
 * status checks start only for rows on (or near) screen.
 */
export default function ContractsCards(props: { contracts: ContractEntry[]; network: NetworkType; label: string }) {
  return (
    <Box as="ul" aria-label={props.label} listStyleType="none" display={{ base: 'block', md: 'none' }} border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden">
      {props.contracts.map(([accountId, data], index) => (
        <Box as="li" key={accountId} px={4} py={3} borderTop={index ? '1px solid' : undefined} borderColor="rule">
          <Link as={NextLink} href={contractPath(accountId)} display="block" fontFamily="mono" fontSize="sm" fontWeight="600" wordBreak="break-all" lineHeight="1.45">
            {accountId}
          </Link>
          <Flex mt={1.5} align="center" gap={2} wrap="wrap">
            <RowHashStatus network={props.network} accountId={accountId} codeHash={data.code_hash} />
            <Text as="span" fontSize="xs" color="muted">
              Block <Text as="span" fontFamily="mono">{data.block_height}</Text>
            </Text>
          </Flex>
          <HStack mt={1} spacing={5} fontSize="sm" fontWeight="500">
            <Link as={NextLink} href={codePath(accountId)} py={1.5}>
              Source<VisuallyHidden> code of {accountId}</VisuallyHidden>
            </Link>
            <ExternalTextLink href={explorerContractUrl(props.network, accountId)} srSuffix={`: view contract ${accountId}`} py={1.5}>
              NearBlocks
            </ExternalTextLink>
          </HStack>
        </Box>
      ))}
    </Box>
  )
}
