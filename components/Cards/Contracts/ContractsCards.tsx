import { Box, Center, Stack, Text } from '@chakra-ui/react'

import CidLink from '@/components/Common/CidLink'
import Approved from '@/components/Contracts/Approved'
import DefaultButton from '@/components/Inputs/DefaultButton'
import { truncateStringInMiddle } from '@/utils/truncate'
import TableHeading from './TableHeading'

export default function ContractsCard(props: {
  contracts: any
  handleShowMore: (_accountId: string) => void
  currentLimit?: number
}) {
  // Default to 5 items if not specified
  const limit = props.currentLimit || 5

  // Generate a unique key for the current set of contracts
  // This ensures Approved components remount when contracts change
  const contractsKey = props.contracts
    ? props.contracts
        .map((c: any) => c[0])
        .join('-')
        .substring(0, 20)
    : 'no-contracts'
  return (
    <Stack
      w={'100%'}
      maxWidth="600px"
      spacing={'10'}
      display={{
        base:
          props.contracts && props.contracts?.length !== 0 ? 'flex' : 'none',
        md: 'none',
      }}
    >
      {/* Render actual contract cards */}
      {props.contracts?.map((contract: any, i: number) => {
        const contractId = contract[0]
        const lang = contract[1].lang
        const blockHeight = contract[1].block_height
        const codeHash = contract[1].code_hash
        const cid = contract[1].cid

        return (
          <Box
            key={i}
            borderColor={'gray.500'}
            borderWidth={'1px'}
            rounded={'lg'}
            p={'4'}
            display={{ base: 'flex', md: 'none' }}
          >
            <Stack spacing={'4'} width={'full'}>
              <TableHeading label={'Contract'}>
                <Text
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  cursor="pointer"
                  onClick={() => {
                    const baseUrl = contractId.endsWith('.testnet')
                      ? 'https://testnet.nearblocks.io/address/'
                      : 'https://nearblocks.io/address/'
                    window.open(`${baseUrl}${contractId}`, '_blank')
                  }}
                >
                  {truncateStringInMiddle(contractId, 30)}
                </Text>
              </TableHeading>
              <TableHeading label={'Block Height'}>
                <Text textAlign={'end'}>{blockHeight}</Text>
              </TableHeading>
              <TableHeading label={'Code Hash'}>
                <Text textAlign={'end'}>
                  {truncateStringInMiddle(codeHash, 8)}
                </Text>
              </TableHeading>
              <TableHeading label={'CID'}>
                <CidLink cid={cid} isTruncated />
              </TableHeading>
              <TableHeading label={'Approved'}>
                <Approved
                  accountId={contractId}
                  cid={cid}
                  codeHash={codeHash}
                  key={`${contractsKey}-${contractId}`}
                />
              </TableHeading>
              <Center>
                <DefaultButton onClick={() => props.handleShowMore(contractId)}>
                  More
                </DefaultButton>
              </Center>
            </Stack>
          </Box>
        )
      })}

      {/* Add placeholder cards to maintain consistent component height */}
      {props.contracts &&
        Array.from({
          length: limit - Math.min(props.contracts.length, limit),
        }).map((_, i) => (
          <Box
            key={`placeholder-${i}`}
            borderColor={'gray.500'}
            borderWidth={'1px'}
            rounded={'lg'}
            p={'4'}
            height="300px" // Approximate height of a card with content
            display={{ base: 'flex', md: 'none' }}
            opacity="0.5"
          >
            <Stack spacing={'4'} width={'full'}>
              <TableHeading label={'Contract'}>
                <Text>&nbsp;</Text>
              </TableHeading>
              <TableHeading label={'Block Height'}>
                <Text>&nbsp;</Text>
              </TableHeading>
              <TableHeading label={'Code Hash'}>
                <Text>&nbsp;</Text>
              </TableHeading>
              <TableHeading label={'CID'}>
                <Text>&nbsp;</Text>
              </TableHeading>
              <TableHeading label={'Approved'}>
                <Text>&nbsp;</Text>
              </TableHeading>
              <Center>
                <DefaultButton isDisabled={true}>More</DefaultButton>
              </Center>
            </Stack>
          </Box>
        ))}
    </Stack>
  )
}
