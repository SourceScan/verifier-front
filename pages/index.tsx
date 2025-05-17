import ContractsCards from '@/components/Cards/Contracts/ContractsCards'
import DefaultTooltip from '@/components/Common/DefaultTooltip'
import PageHead from '@/components/Common/PageHead'
import PageRefresh from '@/components/Common/PageRefresh'
import DefaultButton from '@/components/Inputs/DefaultButton'
import DefaultSelect from '@/components/Inputs/DefaultSelect'
import ContractsTable from '@/components/Tables/ContractsTable'
import { useNetwork } from '@/contexts/NetworkContext'
import { ascii_to_str } from '@/utils/near/ascii_converter'
import { rpc } from '@/utils/near/rpc'
import { range } from '@/utils/range'
import { color } from '@/utils/theme'
import {
  Flex,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import axios from 'axios'
import { NextPageContext } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const limits = [5, 10, 50, 100]

Contracts.getInitialProps = async (ctx: NextPageContext) => {
  return { query: ctx.query }
}

export default function Contracts(props: { query: any }) {
  const router = useRouter()
  const { networkConfig } = useNetwork()

  const [contracts, setContracts] = useState<any>(null)
  const [from_index, setFromIndex] = useState<number>(0)
  const [limit, setLimit] = useState<number>(10)
  const [pages, setPages] = useState<number | null>(null)
  const [selectedPage, setSelectedPage] = useState<number>(1)
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    setSearch(props.query?.search || '')
    setFromIndex(parseInt(props.query?.from_index) || 0)

    const limitToSet = parseInt(props.query?.limit)
    setLimit(limits.includes(limitToSet) ? limitToSet : 10)
  }, [props.query])

  useEffect(() => {
    pages && from_index > pages && setFromIndex(0)
  }, [pages])

  useEffect(() => {
    if (search === '')
      axios
        .post(rpc, {
          jsonrpc: '2.0',
          id: 'dontcare',
          method: 'query',
          params: {
            request_type: 'call_function',
            finality: 'final',
            account_id: networkConfig.contract,
            method_name: 'get_contracts',
            args_base64: Buffer.from(
              `{"from_index": ${from_index}, "limit": ${limit}}`
            ).toString('base64'),
          },
        })
        .then((res) => {
          const str_res = ascii_to_str(res.data.result.result)
          const json_res = JSON.parse(str_res)
          setContracts(json_res[0])
          setPages(json_res[1])
          router.replace(
            router.pathname,
            `/?search=${search}&from_index=${from_index}&limit=${limit}`,
            {
              shallow: true,
            }
          )
        })
        .catch((err) => {
          console.log(err)
        })
    else handleSearch()
  }, [from_index, limit, search, networkConfig.contract, router.pathname])

  const handleSearchChange = (e: any) => {
    setSearch(e.target.value)
  }

  const handleShowMore = (accountId: string) => {
    router.push(`/contract/${accountId}`)
  }

  const handleSearch = () => {
    axios
      .post(rpc, {
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: networkConfig.contract,
          method_name: 'search',
          args_base64: Buffer.from(
            `{"key": "${search}", "from_index": ${from_index}, "limit": ${limit}}`
          ).toString('base64'),
        },
      })
      .then((res) => {
        const str_res = ascii_to_str(res.data.result.result)
        const json_res = JSON.parse(str_res)
        setContracts(json_res[0])
        setPages(json_res[1])
        router.replace(
          router.pathname,
          `/?search=${search}&from_index=${from_index}&limit=${limit}`,
          {
            shallow: true,
          }
        )
      })
      .catch((err) => {
        console.log(err)
      })
  }

  return (
    <>
      <PageHead title={'SourceScan'} />
      <PageRefresh>
        <Stack align={'center'} justify={'center'} spacing={10} pb={100}>
          <Spinner size={'xl'} display={contracts ? 'none' : 'flex'} />
          <Stack
            spacing={{ base: '10', md: '4' }}
            align={'center'}
            display={contracts ? 'flex' : 'none'}
            direction={{ base: 'column', md: 'row' }}
          >
            <HStack>
              <Input
                w={'150px'}
                _placeholder={{
                  color: useColorModeValue(color.light, color.dark),
                }}
                placeholder={'Account ID'}
                borderColor={'gray.500'}
                display={contracts ? 'flex' : 'none'}
                onChange={(e) => handleSearchChange(e)}
                value={search}
                onKeyDown={(e) => {
                  e.key === 'Enter' && handleSearch()
                }}
              />
              <DefaultButton onClick={handleSearch}>Search</DefaultButton>
            </HStack>
            <DefaultTooltip label={'Contracts per page'} placement={'top'}>
              <Flex>
                <DefaultSelect
                  aria-label={'Contracts per page'}
                  size={'md'}
                  w={'80px'}
                  onChange={(e: any) => {
                    setLimit(e.target.value)
                    setFromIndex(0)
                  }}
                  value={limit}
                >
                  {limits.map((limit, i) => (
                    <option key={i} value={limit}>
                      {limit}
                    </option>
                  ))}
                </DefaultSelect>
              </Flex>
            </DefaultTooltip>
          </Stack>
          <ContractsTable
            contracts={contracts}
            handleShowMore={handleShowMore}
          />
          <ContractsCards
            contracts={contracts}
            handleShowMore={handleShowMore}
          />
          <Text display={contracts?.length !== 0 ? 'none' : 'flex'}>
            Nothing here...
          </Text>
          {pages && (
            <HStack display={pages ? 'flex' : 'none'}>
              <>
                {range(
                  pages > 1
                    ? selectedPage > 2
                      ? selectedPage - 2
                      : 0
                    : selectedPage - 1,
                  pages > 1
                    ? selectedPage + 1 < pages
                      ? selectedPage
                      : pages - 1
                    : pages - 1
                ).map((x, i: number) => (
                  <DefaultButton
                    key={`button_${i}`}
                    onClick={() => {
                      setSelectedPage(x + 1)
                      setFromIndex(x * limit)
                    }}
                  >
                    {x + 1}
                  </DefaultButton>
                ))}
              </>
            </HStack>
          )}
        </Stack>
      </PageRefresh>
    </>
  )
}
