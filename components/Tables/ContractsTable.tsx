import ExternalTextLink from '@/components/Common/ExternalTextLink'
import { RowHashStatus } from '@/components/Contracts/HashStatus'
import type { NetworkType } from '@/contexts/NetworkContext'
import type { ContractEntry } from '@/utils/contracts'
import { truncateStringInMiddle } from '@/utils/truncate'
import { codePath, contractPath, explorerContractUrl, ipfsUrl } from '@/utils/urls'
import { Box, Button, HStack, Link, Table, Tbody, Td, Text, Th, Thead, Tr, VisuallyHidden } from '@chakra-ui/react'
import NextLink from 'next/link'

const LG = { base: 'none', lg: 'table-cell' }
const XL = { base: 'none', xl: 'table-cell' }

/**
 * Registry table (md+). Columns are added as width allows, so it never
 * scrolls sideways; each status cell checks the chain only while visible.
 */
export default function ContractsTable(props: { contracts: ContractEntry[]; network: NetworkType; caption: string }) {
  return (
    <Box display={{ base: 'none', md: 'block' }} border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden">
      <Table
        size="sm"
        sx={{
          tableLayout: 'fixed',
          th: { fontFamily: 'body', textTransform: 'none', letterSpacing: 0, fontSize: 'xs', fontWeight: 600, color: 'muted', bg: 'subtle', borderColor: 'rule', py: 2.5, px: 4 },
          td: { borderColor: 'rule', py: 2.5, px: 4, fontSize: 'sm' },
          'tbody tr:last-of-type td': { borderBottom: 'none' },
        }}
      >
        <VisuallyHidden as="caption">{props.caption}</VisuallyHidden>
        <Thead>
          <Tr>
            <Th scope="col">Contract</Th>
            <Th scope="col" w="170px">On-chain status</Th>
            <Th scope="col" w="130px" isNumeric display={LG}>Block height</Th>
            <Th scope="col" w="160px" display={XL}>Code hash</Th>
            <Th scope="col" w="170px" display={XL}>IPFS snapshot</Th>
            <Th scope="col" w="210px"><VisuallyHidden>Links</VisuallyHidden></Th>
          </Tr>
        </Thead>
        <Tbody>
          {props.contracts.map(([accountId, data]) => (
            <Tr key={accountId} _hover={{ bg: 'subtle' }}>
              <Td>
                <Link as={NextLink} href={contractPath(accountId)} title={accountId} display="block" fontFamily="mono" fontSize="13px" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {accountId}
                </Link>
              </Td>
              <Td>
                <RowHashStatus network={props.network} accountId={accountId} codeHash={data.code_hash} />
              </Td>
              <Td isNumeric display={LG} fontFamily="mono" fontSize="13px" color="muted">
                {data.block_height}
              </Td>
              <Td display={XL}>
                <Text fontFamily="mono" fontSize="13px" color="muted" title={data.code_hash} whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                  {truncateStringInMiddle(data.code_hash, 12)}
                </Text>
              </Td>
              <Td display={XL}>
                <ExternalTextLink href={ipfsUrl(data.cid)} srSuffix={`IPFS snapshot ${data.cid}`} title={data.cid} fontFamily="mono" fontSize="13px" whiteSpace="nowrap">
                  {truncateStringInMiddle(data.cid, 12)}
                </ExternalTextLink>
              </Td>
              <Td>
                <HStack spacing={3} justify="flex-end">
                  <Button as={NextLink} href={codePath(accountId)} size="xs" variant="quiet">
                    Source<VisuallyHidden> code of {accountId}</VisuallyHidden>
                  </Button>
                  <ExternalTextLink href={explorerContractUrl(props.network, accountId)} srSuffix={`: view contract ${accountId}`} fontSize="sm" fontWeight="500" title={`View contract on NearBlocks`}>
                    NearBlocks
                  </ExternalTextLink>
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  )
}
