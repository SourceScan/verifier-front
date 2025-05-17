import { truncateStringInMiddle } from '@/utils/truncate'
import { InfoIcon } from '@chakra-ui/icons'
import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'

import CidLink from '../Common/CidLink'
import DefaultTooltip from '../Common/DefaultTooltip'
import Approved from '../Contracts/Approved'

export default function ContractsTable(props: {
  contracts: any
  handleShowMore: (_accountId: string) => void
}) {
  return (
    <TableContainer
      borderColor={'gray.500'}
      borderWidth={'1px'}
      rounded={'lg'}
      display={{
        base: 'none',
        md: props.contracts && props.contracts?.length !== 0 ? 'flex' : 'none',
      }}
    >
      <Table variant={'simple'} size={{ md: 'md' }}>
        <Thead>
          <Tr>
            <Th>Contract</Th>
            <Th>Lang</Th>
            <Th>Block Height</Th>
            <Th>Code Hash</Th>
            <Th>IPFS</Th>
            <Th>Approved</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {props.contracts?.map((contract: any, i: number) => {
            const accountId = contract[0]
            const lang = contract[1].lang
            const blockHeight = contract[1].block_height
            const codeHash = contract[1].code_hash
            const cid = contract[1].cid
            return (
              <Tr key={i}>
                <Td>{accountId}</Td>
                <Td>{lang}</Td>
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
        </Tbody>
      </Table>
    </TableContainer>
  )
}
