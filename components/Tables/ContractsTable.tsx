import { InfoIcon } from '@chakra-ui/icons'
import {
  HStack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'

import CidLink from '../Common/CidLink'
import DefaultTooltip from '../Common/DefaultTooltip'
import IconLink from '../Common/IconLink'
import Approved from '../Contracts/Approved'

export default function ContractsTable(props: {
  contracts: any
  handleShowMore: (accountId: string) => void
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
            <Th>IPFS</Th>
            <Th>Github</Th>
            <Th>Approved</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {props.contracts?.map((contract: any, i: number) => {
            const accountId = contract[0]
            const lang = contract[1].lang
            const cid = contract[1].cid
            const deploy_tx = contract[1].deploy_tx
            const github = contract[1].github
            return (
              <Tr key={i}>
                <Td>{accountId}</Td>
                <Td>{lang}</Td>
                <Td>
                  <CidLink cid={cid} isTruncated />
                </Td>
                <Td>
                  {github ? (
                    <HStack>
                      <Text>
                        {github.owner}/{github.repo}
                      </Text>
                      <IconLink
                        onClick={() => {
                          window.open(
                            `https://github.com/${github.owner}/${github.repo}/tree/${github.sha}`,
                            '_blank'
                          )
                        }}
                      />
                    </HStack>
                  ) : (
                    'None'
                  )}
                </Td>
                <Td>
                  <Approved
                    accountId={accountId}
                    cid={cid}
                    deploy_tx={deploy_tx}
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
