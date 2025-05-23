import { useNetwork } from '@/contexts/NetworkContext'
import { InfoIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Stack,
  Text,
  useColorMode,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { VscCode } from 'react-icons/vsc'

import CidLink from '@/components/Common/CidLink'
import Approved from '@/components/Contracts/Approved'
import { truncateStringInMiddle } from '@/utils/truncate'
import TableHeading from './TableHeading'

export default function ContractsCard(props: {
  contracts: any
  handleShowMore: (_accountId: string) => void
  currentLimit?: number
}) {
  const router = useRouter()
  const { colorMode } = useColorMode()
  const { networkConfig } = useNetwork()

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

  const navigateToCodeView = (accountId: string) => {
    router.push(`/code/${accountId}`)
  }

  return (
    <Stack
      w={'95%'}
      maxWidth="600px"
      spacing={'10'}
      display={{
        base: 'flex',
        md: 'none',
      }}
      minHeight="500px"
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
              <HStack spacing={3} justifyContent="center">
                <Button
                  size="sm"
                  leftIcon={<VscCode />}
                  onClick={() => navigateToCodeView(contractId)}
                  bg="transparent"
                  color={colorMode === 'dark' ? 'gray.100' : 'gray.700'}
                  borderColor={colorMode === 'dark' ? 'gray.100' : 'gray.700'}
                  _hover={{
                    bg: colorMode === 'dark' ? 'gray.100' : 'gray.700',
                    color: colorMode === 'dark' ? 'gray.900' : 'white',
                  }}
                  variant="outline"
                >
                  Code
                </Button>
                <Button
                  size="sm"
                  leftIcon={<InfoIcon />}
                  onClick={() => props.handleShowMore(contractId)}
                  bg="transparent"
                  color={colorMode === 'dark' ? 'gray.100' : 'gray.700'}
                  borderColor={colorMode === 'dark' ? 'gray.100' : 'gray.700'}
                  _hover={{
                    bg: colorMode === 'dark' ? 'gray.100' : 'gray.700',
                    color: colorMode === 'dark' ? 'gray.900' : 'white',
                  }}
                  variant="outline"
                >
                  Info
                </Button>
              </HStack>
            </Stack>
          </Box>
        )
      })}

      {/* Placeholder cards removed for mobile UI */}
    </Stack>
  )
}
