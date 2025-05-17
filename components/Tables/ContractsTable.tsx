import { truncateStringInMiddle } from '@/utils/truncate'
import { InfoIcon } from '@chakra-ui/icons'
import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import CidLink from '../Common/CidLink'
import DefaultTooltip from '../Common/DefaultTooltip'
import Approved from '../Contracts/Approved'

export default function ContractsTable(props: {
  contracts: any
  handleShowMore: (_accountId: string) => void
}) {
  // Default limit
  const [limit, setLimit] = useState(5)

  // Get the limit from URL on client-side only
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlLimit = parseInt(urlParams.get('limit') || '5')
    setLimit(isNaN(urlLimit) ? 5 : urlLimit)
  }, [])
  return (
    <TableContainer
      borderColor={'gray.500'}
      borderWidth={'1px'}
      rounded={'lg'}
      display={{
        base: 'none',
        md: props.contracts && props.contracts?.length !== 0 ? 'flex' : 'none',
      }}
      width="100%"
      maxWidth="1200px"
    >
      <Table variant={'simple'} size={{ md: 'md' }}>
        <Thead>
          <Tr>
            <Th width="30%" textAlign="left">
              Contract
            </Th>
            <Th width="15%" textAlign="left">
              Block Height
            </Th>
            <Th width="15%" textAlign="left">
              Code Hash
            </Th>
            <Th width="20%" textAlign="left">
              IPFS
            </Th>
            <Th width="10%" textAlign="left">
              Approved
            </Th>
            <Th width="10%" textAlign="left">
              Info
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {/* Render actual contract rows */}
          {props.contracts?.map((contract: any, i: number) => {
            const accountId = contract[0]
            const lang = contract[1].lang
            const blockHeight = contract[1].block_height
            const codeHash = contract[1].code_hash
            const cid = contract[1].cid
            return (
              <Tr key={i}>
                <Td
                  maxW="400px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  width="30%"
                >
                  <Text
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    cursor="pointer"
                    onClick={() => {
                      const baseUrl = accountId.endsWith('.testnet')
                        ? 'https://testnet.nearblocks.io/address/'
                        : 'https://nearblocks.io/address/'
                      window.open(`${baseUrl}${accountId}`, '_blank')
                    }}
                  >
                    {truncateStringInMiddle(accountId, 30)}
                  </Text>
                </Td>
                <Td>{blockHeight}</Td>
                <Td>{truncateStringInMiddle(codeHash, 8)}</Td>
                <Td>
                  <CidLink cid={cid} isTruncated />
                </Td>
                <Td>
                  <Approved
                    accountId={accountId}
                    cid={cid}
                    codeHash={codeHash}
                  />
                </Td>
                <Td>
                  <DefaultTooltip label={'Show More'} placement={'top'}>
                    <InfoIcon
                      cursor={'pointer'}
                      onClick={() => props.handleShowMore(accountId)}
                    />
                  </DefaultTooltip>
                </Td>
              </Tr>
            )
          })}

          {/* Add placeholder rows to maintain consistent table height based on the selected limit */}
          {props.contracts &&
            Array.from({
              length: limit - Math.min(props.contracts.length, limit),
            }).map((_, i) => (
              <Tr key={`placeholder-${i}`} height="57px">
                <Td width="30%"></Td>
                <Td width="15%"></Td>
                <Td width="15%"></Td>
                <Td width="20%"></Td>
                <Td width="10%"></Td>
                <Td width="10%"></Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}
