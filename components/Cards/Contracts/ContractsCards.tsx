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
      w={'100%'}
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
                  bg={colorMode === 'dark' ? 'transparent' : 'transparent'}
                  color={colorMode === 'dark' ? '#E8A317' : '#228B22'}
                  borderColor={colorMode === 'dark' ? '#E8A317' : '#228B22'}
                  _hover={{
                    bg: colorMode === 'dark' ? '#E8A31720' : '#228B2220',
                  }}
                  variant="outline"
                >
                  Code
                </Button>
                <Button
                  size="sm"
                  leftIcon={<InfoIcon />}
                  onClick={() => props.handleShowMore(contractId)}
                  bg={colorMode === 'dark' ? 'transparent' : 'transparent'}
                  color={colorMode === 'dark' ? '#E8A317' : '#228B22'}
                  borderColor={colorMode === 'dark' ? '#E8A317' : '#228B22'}
                  _hover={{
                    bg: colorMode === 'dark' ? '#E8A31720' : '#228B2220',
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
            height="320px" // Slightly increased to account for new button
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
              <HStack spacing={3} justifyContent="center">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<VscCode />}
                  isDisabled={true}
                  bg={colorMode === 'dark' ? 'transparent' : 'transparent'}
                  color={colorMode === 'dark' ? '#E8A31750' : '#228B2250'}
                  borderColor={colorMode === 'dark' ? '#E8A31750' : '#228B2250'}
                >
                  Code
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<InfoIcon />}
                  isDisabled={true}
                  bg={colorMode === 'dark' ? 'transparent' : 'transparent'}
                  color={colorMode === 'dark' ? '#E8A31750' : '#228B2250'}
                  borderColor={colorMode === 'dark' ? '#E8A31750' : '#228B2250'}
                >
                  Info
                </Button>
              </HStack>
            </Stack>
          </Box>
        ))}
    </Stack>
  )
}
