import ContractsCards from '@/components/Cards/Contracts/ContractsCards'
import ContractsCardsSkeleton from '@/components/Cards/Contracts/ContractsCardsSkeleton'
import DefaultTooltip from '@/components/Common/DefaultTooltip'
import PageHead from '@/components/Common/PageHead'
import PageRefresh from '@/components/Common/PageRefresh'
import DefaultButton from '@/components/Inputs/DefaultButton'
import DefaultSelect from '@/components/Inputs/DefaultSelect'
import ContractsTable from '@/components/Tables/ContractsTable'
import ContractsTableSkeleton from '@/components/Tables/ContractsTableSkeleton'
import { useNetwork } from '@/contexts/NetworkContext'
import { ascii_to_str } from '@/utils/near/ascii_converter'
import { useRpcUrl } from '@/utils/near/rpc'
import { bg, color } from '@/utils/theme'
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
// Default limit is 5
const DEFAULT_LIMIT = 5

Contracts.getInitialProps = async (ctx: NextPageContext) => {
  return { query: ctx.query }
}

export default function Contracts(props: { query: any }) {
  const router = useRouter()
  const { networkConfig } = useNetwork()
  const rpcUrl = useRpcUrl()

  const [contracts, setContracts] = useState<any>(null)
  const [from_index, setFromIndex] = useState<number>(0)
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT)
  const [pages, setPages] = useState<number | null>(null)
  const [selectedPage, setSelectedPage] = useState<number>(1)
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    setSearch(props.query?.search || '')
    setFromIndex(parseInt(props.query?.from_index) || 0)

    const limitToSet = parseInt(props.query?.limit)
    setLimit(limits.includes(limitToSet) ? limitToSet : DEFAULT_LIMIT)
  }, [props.query])

  useEffect(() => {
    pages && from_index > pages && setFromIndex(0)
  }, [pages])

  useEffect(() => {
    // Ensure we have a valid contract address before making the request
    if (!networkConfig || !networkConfig.contract) {
      console.error('Network configuration or contract address is missing')
      return
    }

    // Log the network being used for debugging
    console.log('Loading contracts for network:', networkConfig.name)

    // Set loading state when starting a new request
    setIsLoading(true)

    if (search === '')
      axios
        .post(
          rpcUrl,
          {
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
          },
          {
            headers: {
              'X-Network': networkConfig.name.toLowerCase(),
            },
          }
        )
        .then((res) => {
          // Clear loading state
          setIsLoading(false)

          if (!res.data || !res.data.result || !res.data.result.result) {
            console.error('Invalid response format:', res.data)
            return
          }

          try {
            const str_res = ascii_to_str(res.data.result.result)
            const json_res = JSON.parse(str_res)

            if (Array.isArray(json_res) && json_res.length >= 2) {
              setContracts(json_res[0])
              setPages(json_res[1])

              router.replace(
                router.pathname,
                `/?search=${search}&from_index=${from_index}&limit=${limit}`,
                {
                  shallow: true,
                }
              )
            } else {
              console.error('Invalid JSON response format:', json_res)
            }
          } catch (parseError) {
            console.error('Error parsing response:', parseError)
          }
        })
        .catch((err) => {
          console.error('Error fetching contracts:', err)
          setIsLoading(false)
        })
    else handleSearch()
  }, [from_index, limit, search, networkConfig, router.pathname, rpcUrl])

  const handleSearchChange = (e: any) => {
    setSearch(e.target.value)
  }

  const handleShowMore = (accountId: string) => {
    router.push(`/contract/${accountId}`)
  }

  const handleSearch = () => {
    // Ensure we have a valid contract address before making the request
    if (!networkConfig || !networkConfig.contract) {
      console.error('Network configuration or contract address is missing')
      return
    }

    // Set loading state when starting a search
    setIsLoading(true)

    axios
      .post(
        rpcUrl,
        {
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
        },
        {
          headers: {
            'X-Network': networkConfig.name.toLowerCase(),
          },
        }
      )
      .then((res) => {
        // Clear loading state
        setIsLoading(false)

        if (!res.data || !res.data.result || !res.data.result.result) {
          console.error('Invalid response format:', res.data)
          return
        }

        try {
          const str_res = ascii_to_str(res.data.result.result)
          const json_res = JSON.parse(str_res)

          if (Array.isArray(json_res) && json_res.length >= 2) {
            setContracts(json_res[0])
            setPages(json_res[1])

            router.replace(
              router.pathname,
              `/?search=${search}&from_index=${from_index}&limit=${limit}`,
              {
                shallow: true,
              }
            )
          } else {
            console.error('Invalid JSON response format:', json_res)
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
        }
      })
      .catch((err) => {
        console.error('Error searching contracts:', err)
        setIsLoading(false)
      })
  }

  // Get color values outside of the callback
  const bgColor = useColorModeValue(bg.light, bg.dark)

  return (
    <>
      <PageHead title={'SourceScan'} />
      <PageRefresh>
        <Stack align={'center'} justify={'center'} spacing={10} pb={100}>
          {isLoading && !contracts && <Spinner size={'xl'} />}
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
                    const newLimit = parseInt(e.target.value)
                    setLimit(newLimit)
                    // Reset to first page when changing limit
                    setSelectedPage(1)
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
          {/* Always render the containers to maintain consistent layout */}
          {isLoading || !contracts ? (
            <>
              <ContractsTableSkeleton count={limit} />
              <ContractsCardsSkeleton count={limit} />
            </>
          ) : (
            <>
              <ContractsTable
                contracts={contracts}
                handleShowMore={handleShowMore}
                currentLimit={limit}
              />
              <ContractsCards
                contracts={contracts}
                handleShowMore={handleShowMore}
                currentLimit={limit}
              />
            </>
          )}
          <Text display={contracts?.length !== 0 ? 'none' : 'flex'}>
            Nothing here...
          </Text>
          {pages && (
            <HStack display={pages ? 'flex' : 'none'}>
              {/* Always show 3 pagination buttons */}
              {(() => {
                // Calculate which 3 buttons to show
                let buttonsToShow = []

                if (pages <= 3) {
                  // If there are 3 or fewer pages, show all of them
                  buttonsToShow = Array.from({ length: pages }, (_, i) => i)
                } else if (selectedPage === 1) {
                  // If on first page, show pages 1, 2, 3
                  buttonsToShow = [0, 1, 2]
                } else if (selectedPage === pages) {
                  // If on last page, show last 3 pages
                  buttonsToShow = [pages - 3, pages - 2, pages - 1]
                } else {
                  // Otherwise show previous, current, and next page
                  buttonsToShow = [
                    selectedPage - 2,
                    selectedPage - 1,
                    selectedPage,
                  ]
                }

                return buttonsToShow.map((pageIndex) => {
                  if (pageIndex < 0 || pageIndex >= pages) return null
                  const isSelected = selectedPage === pageIndex + 1
                  return (
                    <DefaultButton
                      key={`button_${pageIndex}`}
                      onClick={() => {
                        setSelectedPage(pageIndex + 1)
                        setFromIndex(pageIndex * limit)
                      }}
                      borderStyle={isSelected ? 'solid' : 'dashed'}
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      bg={isSelected ? 'gray.200' : bgColor}
                      _hover={{ bg: isSelected ? 'gray.200' : bgColor }}
                      minW="40px"
                      w="40px"
                      h="40px"
                      px={0}
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                    >
                      {pageIndex + 1}
                    </DefaultButton>
                  )
                })
              })()}
            </HStack>
          )}
        </Stack>
      </PageRefresh>
    </>
  )
}
