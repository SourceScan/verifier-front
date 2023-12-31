import { Box, Center, Stack, Text } from '@chakra-ui/react'

import CidLink from '@/components/Common/CidLink'
import IconLink from '@/components/Common/IconLink'
import Approved from '@/components/Contracts/Approved'
import DefaultButton from '@/components/Inputs/DefaultButton'
import TableHeading from './TableHeading'

export default function ContractsCard(props: {
  contracts: any
  handleShowMore: (accountId: string) => void
}) {
  return (
    <Stack
      w={'80%'}
      spacing={'10'}
      display={{
        base:
          props.contracts && props.contracts?.length !== 0 ? 'flex' : 'none',
        md: 'none',
      }}
    >
      {props.contracts?.map((contract: any, i: number) => {
        const accountId = contract[0]
        const lang = contract[1].lang
        const cid = contract[1].cid
        const deploy_tx = contract[1].deploy_tx
        const github = contract[1].github
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
                <Text textAlign={'end'}>{accountId}</Text>
              </TableHeading>
              <TableHeading label={'Lang'}>
                <Text textAlign={'end'}>{lang}</Text>
              </TableHeading>
              <TableHeading label={'CID'}>
                <CidLink cid={cid} isTruncated />
              </TableHeading>
              <TableHeading label={'Github'}>
                {github ? (
                  <>
                    <Text textAlign={'end'}>
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
                  </>
                ) : (
                  <Text textAlign={'end'}>None</Text>
                )}
              </TableHeading>
              <TableHeading label={'Approved'}>
                <Approved
                  accountId={accountId}
                  cid={cid}
                  deploy_tx={deploy_tx}
                />
              </TableHeading>
              <Center>
                <DefaultButton onClick={() => props.handleShowMore(accountId)}>
                  More
                </DefaultButton>
              </Center>
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}
