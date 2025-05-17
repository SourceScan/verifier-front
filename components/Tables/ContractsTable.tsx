import { truncateStringInMiddle } from '@/utils/truncate'
import { InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  HStack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorMode,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { VscCode } from 'react-icons/vsc'
import CidLink from '../Common/CidLink'
import DefaultTooltip from '../Common/DefaultTooltip'
import Approved from '../Contracts/Approved'

export default function ContractsTable(props: {
  contracts: any
  handleShowMore: (_accountId: string) => void
  currentLimit: number
}) {
  const router = useRouter()
  const { colorMode } = useColorMode()

  // Use the limit provided by the parent component
  const limit = props.currentLimit

  // Generate a unique key for the current set of contracts
  // This ensures Approved components remount when contracts change
  const contractsKey = props.contracts
    ? props.contracts
        .map((c: any) => c[0])
        .join('-')
        .substring(0, 20)
    : 'no-contracts'

  const navigateToCodeView = (accountId: string) => {
    router.push(`/code/${accountId}`)
  }

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
            <Th width="15%" textAlign="left">
              IPFS
            </Th>
            <Th width="10%" textAlign="left">
              Approved
            </Th>
            <Th width="15%" textAlign="left">
              Actions
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
                    key={`${contractsKey}-${accountId}`}
                  />
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <DefaultTooltip label={'View Code'} placement={'top'}>
                      <Button
                        size="xs"
                        leftIcon={<VscCode />}
                        onClick={() => navigateToCodeView(accountId)}
                        aria-label="View Code"
                        colorScheme={colorMode === 'dark' ? 'blue' : 'teal'}
                        variant="outline"
                      >
                        Code
                      </Button>
                    </DefaultTooltip>

                    <DefaultTooltip label={'Show More'} placement={'top'}>
                      <Button
                        size="xs"
                        leftIcon={<InfoIcon />}
                        onClick={() => props.handleShowMore(accountId)}
                        aria-label="Show More"
                        colorScheme={colorMode === 'dark' ? 'blue' : 'teal'}
                        variant="outline"
                      >
                        Info
                      </Button>
                    </DefaultTooltip>
                  </HStack>
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
                <Td width="15%"></Td>
                <Td width="10%"></Td>
                <Td width="15%"></Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}
