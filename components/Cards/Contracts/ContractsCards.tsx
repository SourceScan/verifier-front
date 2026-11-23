import ExternalTextLink from '@/components/Common/ExternalTextLink'
import type { NetworkType } from '@/contexts/NetworkContext'
import { ContractEntry, verificationLabel } from '@/utils/contracts'
import { explorerContractUrl, workspaceHref } from '@/utils/urls'
import { Box, Link, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

/** Compact layout for historical verification records. */
export default function ContractsCards(props: { contracts: ContractEntry[]; network: NetworkType; label: string }) {
  return (
    <Box as="ul" aria-label={props.label} listStyleType="none" display={{ base: 'block', md: 'none' }} border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden">
      {props.contracts.map(([accountId, data], index) => (
        <Box as="li" key={accountId} px={4} py={3} borderTop={index ? '1px solid' : undefined} borderColor="rule">
          <Link as={NextLink} href={workspaceHref(accountId, { network: props.network })} display="block" fontFamily="mono" fontSize="sm" fontWeight="600" wordBreak="break-all" lineHeight="1.45">
            {accountId}
          </Link>
          <Text mt={1.5} fontSize="xs" color="muted">
            {verificationLabel(data.block_height)}
          </Text>
          <ExternalTextLink href={explorerContractUrl(props.network, accountId)} srSuffix={`: view contract ${accountId}`} mt={1} py={1.5} fontSize="sm" fontWeight="500">
            NearBlocks
          </ExternalTextLink>
        </Box>
      ))}
    </Box>
  )
}
