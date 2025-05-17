import { GithubDto } from '@/Interfaces/github/github.dto'
import { useNetwork } from '@/contexts/NetworkContext'
import { extractGitHubDetails } from '@/utils/extractGithub'
import { ascii_to_str } from '@/utils/near/ascii_converter'
import { useRpcUrl } from '@/utils/near/rpc'
import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Flex,
  HStack,
  Heading,
  Link,
  Skeleton,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CidLink from '@/components/Common/CidLink'
import DefaultHeading from '@/components/Common/DefaultHeading'
import GithubLink from '@/components/Common/GithubLink'
import IconLink from '@/components/Common/IconLink'
import PageHead from '@/components/Common/PageHead'
import PageRefresh from '@/components/Common/PageRefresh'
import { getDockerHubLink, getImageNameAndDigest } from '@/utils/getDockerHub'
import axios from 'axios'

export default function Contract() {
  const toast = useToast()
  const router = useRouter()
  const accountId = router.query.slug as string
  const { networkConfig } = useNetwork()
  const rpcUrl = useRpcUrl()

  const [data, setData] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [wasmMatch, setWasmMatch] = useState<boolean | null>(null)
  const [wasmError, setWasmError] = useState<string | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [github, setGithub] = useState<GithubDto | null>(null)
  const [loadingLinks, setLoadingLinks] = useState(true)

  useEffect(() => {
    if (!accountId || !networkConfig) return

    // Determine which contract to use based on the network
    const contractAddress =
      typeof window !== 'undefined' &&
      localStorage.getItem('network') === 'testnet'
        ? process.env.NEXT_PUBLIC_CONTRACT_TESTNET
        : process.env.NEXT_PUBLIC_CONTRACT_MAINNET

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
            account_id: contractAddress,
            method_name: 'get_contract',
            args_base64: Buffer.from(`{"account_id": "${accountId}"}`).toString(
              'base64'
            ),
          },
        },
        {
          headers: {
            'X-Network': networkConfig.name.toLowerCase(),
          },
        }
      )
      .then((res) => {
        const str_res = ascii_to_str(res.data.result.result)
        const json_res = JSON.parse(str_res)
        setData(json_res)
      })
      .catch((err) => {
        console.log(err)
      })
  }, [accountId, rpcUrl, networkConfig])

  useEffect(() => {
    if (!data || !networkConfig) return

    axios
      .post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          id: 'dontcare',
          method: 'query',
          params: {
            request_type: 'view_code',
            finality: 'final',
            account_id: accountId,
          },
        },
        {
          headers: {
            'X-Network': networkConfig.name.toLowerCase(),
          },
        }
      )
      .then((res) => {
        setWasmMatch(res.data.result.hash === data.code_hash)
      })
      .catch((err) => {
        setWasmError(err.message)
        setWasmMatch(false)
      })

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
            account_id: accountId,
            method_name: 'contract_source_metadata',
            args_base64: '',
          },
        },
        {
          headers: {
            'X-Network': networkConfig.name.toLowerCase(),
          },
        }
      )
      .then((res) => {
        const str_res = ascii_to_str(res.data.result.result)
        const json_res = JSON.parse(str_res)
        setMetadata(json_res)

        try {
          const github = extractGitHubDetails(
            json_res.build_info.source_code_snapshot
          )
          github && setGithub(github)
        } catch (e) {}
      })
      .catch((err) => {
        setTxError(err.message)
      })
      .finally(() => {
        setLoadingLinks(false)
      })
  }, [data, accountId, rpcUrl, networkConfig])

  useEffect(() => {
    if (!wasmError) return

    toast({
      title: 'Wasm Match Error',
      description: wasmError,
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'bottom',
    })
  }, [wasmError, toast])

  useEffect(() => {
    if (!txError) return

    toast({
      title: 'Tx Match Error',
      description: txError,
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'bottom',
    })
  }, [txError, toast])

  return (
    <>
      <PageHead title={'SourceScan'} />
      <PageRefresh>
        <Stack align={'center'} justify={'center'} spacing={10} pb={100}>
          {data ? (
            <Stack
              p={'4'}
              borderColor={'gray.500'}
              borderStyle={'dashed'}
              borderWidth={'1px'}
              rounded={'lg'}
              textAlign={{ base: 'center', md: 'start' }}
              align={{ base: 'center', md: 'start' }}
              justify={{ base: 'center', md: 'start' }}
              spacing={'10'}
              w={{ base: '100%', md: '80%', lg: '60%' }}
            >
              <HStack spacing={'1'}>
                <Heading fontSize={'lg'}>{accountId}</Heading>
                <IconLink
                  onClick={() =>
                    window.open(
                      `https://${
                        process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
                          ? ''
                          : 'testnet.'
                      }nearblocks.io/address/${accountId}`,
                      '_blank'
                    )
                  }
                />
              </HStack>
              <Stack spacing={'4'}>
                <DefaultHeading>Security Checks</DefaultHeading>
                {wasmMatch === null ? (
                  <Spinner size={'sm'} />
                ) : wasmMatch ? (
                  <HStack>
                    <CheckIcon />
                    <Text>Code Hash Matches</Text>
                  </HStack>
                ) : (
                  <HStack>
                    <CloseIcon />
                    <Text>Code Hash Mismatches</Text>
                  </HStack>
                )}
              </Stack>
              <Stack spacing={'4'}>
                <DefaultHeading>Lang</DefaultHeading>
                <Text fontSize={{ base: 'md', md: 'lg' }}>
                  {data.lang === 'ts'
                    ? 'TypeScript'
                    : data.lang === 'rust'
                    ? 'Rust'
                    : 'unknown'}
                </Text>
              </Stack>
              <Stack spacing={'4'}>
                <DefaultHeading>Block</DefaultHeading>
                <Text fontSize={{ base: 'md', md: 'lg' }}>
                  {data.block_height}
                </Text>
              </Stack>
              <Stack spacing={'4'}>
                <DefaultHeading>Code Hash</DefaultHeading>
                <Text fontSize={{ base: 'md', md: 'lg' }}>
                  {data.code_hash}
                </Text>
              </Stack>
              <Stack>
                <DefaultHeading>IPFS</DefaultHeading>
                <Flex display={{ base: 'none', md: 'flex' }}>
                  <CidLink cid={data.cid} />
                </Flex>
                <Flex display={{ base: 'flex', md: 'none' }}>
                  <CidLink cid={data.cid} isTruncated />
                </Flex>
              </Stack>
              <Stack
                spacing={'4'}
                display={data?.github ? 'flex' : 'none'}
                w={'full'}
              >
                <DefaultHeading>Github</DefaultHeading>
                {data?.github ? <GithubLink github={data.github} /> : null}
              </Stack>
              {/* New Section for Links to Source Code */}
              <Stack spacing={'4'}>
                <DefaultHeading>Source Code</DefaultHeading>
                <HStack>
                  <Text>Github</Text>
                  {loadingLinks ? (
                    <Skeleton height="20px" width="150px" />
                  ) : (
                    github && (
                      <Link
                        href={`https://github.com/${github.owner}/${
                          github.repo
                        }/blob/${github.sha}/${(() => {
                          // Log paths for debugging
                          console.log(
                            'Contract path:',
                            metadata.build_info.contract_path
                          )

                          // Get normalized path
                          let normalizedPath = ''
                          if (metadata.build_info.contract_path) {
                            normalizedPath =
                              metadata.build_info.contract_path.toString()
                            if (normalizedPath.endsWith('/')) {
                              normalizedPath = normalizedPath.slice(0, -1)
                            }
                          }

                          // For Rust contracts, ensure proper path structure
                          if (data.lang === 'rust') {
                            if (normalizedPath.endsWith('src')) {
                              return `${normalizedPath}/lib.rs`
                            } else if (normalizedPath.includes('/src/')) {
                              const parts = normalizedPath.split('/src/')
                              return `${parts[0]}/src/lib.rs`
                            } else {
                              return normalizedPath
                                ? `${normalizedPath}/src/lib.rs`
                                : 'src/lib.rs'
                            }
                          } else {
                            // For non-Rust contracts, just use the normalized path
                            return normalizedPath
                          }
                        })()}`}
                        isExternal
                      >
                        <ExternalLinkIcon />
                      </Link>
                    )
                  )}
                </HStack>
                <HStack>
                  <Text>Code Viewer (IPFS)</Text>
                  {loadingLinks ? (
                    <Skeleton height="20px" width="150px" />
                  ) : (
                    <Link href={`/code/${accountId}`}>
                      <ExternalLinkIcon />
                    </Link>
                  )}
                </HStack>
              </Stack>

              {metadata ? (
                <>
                  <Heading fontSize={'lg'}>Contract Metadata</Heading>
                  <Stack spacing={'4'}>
                    <DefaultHeading>Version</DefaultHeading>
                    <Text fontSize={{ base: 'md', md: 'lg' }}>
                      {metadata.version || 'N/A'}
                    </Text>
                  </Stack>
                  <Stack spacing={'4'}>
                    <DefaultHeading>Standards</DefaultHeading>
                    <Text fontSize={{ base: 'md', md: 'lg' }}>
                      {metadata.standards
                        .map((s: any) => `${s.standard}:v${s.version}`)
                        .join(', ')}
                    </Text>
                  </Stack>
                  <Stack spacing={'4'}>
                    <DefaultHeading>Git</DefaultHeading>
                    {github ? <GithubLink github={github} /> : null}
                  </Stack>
                  <Stack spacing={'4'}>
                    <DefaultHeading>Build Command</DefaultHeading>
                    <Text fontSize={{ base: 'md', md: 'lg' }}>
                      {metadata.build_info.build_command.join(' ')}
                    </Text>
                  </Stack>
                  <Stack spacing={'4'}>
                    <DefaultHeading>Build Environment</DefaultHeading>
                    {metadata.build_info.build_environment ? (
                      <Stack>
                        {(() => {
                          const { imageName, digest: _digest } =
                            getImageNameAndDigest(
                              metadata.build_info.build_environment
                            )
                          return (
                            <>
                              <HStack>
                                <Text fontSize={{ base: 'md', md: 'lg' }}>
                                  {imageName}
                                </Text>{' '}
                                <Link
                                  href={getDockerHubLink(
                                    metadata.build_info.build_environment
                                  )}
                                  isExternal
                                  fontSize={{ base: 'md', md: 'lg' }}
                                >
                                  <ExternalLinkIcon />
                                </Link>
                              </HStack>
                            </>
                          )
                        })()}
                      </Stack>
                    ) : (
                      <Text fontSize={{ base: 'md', md: 'lg' }}>
                        {metadata.build_info.build_environment}
                      </Text>
                    )}
                  </Stack>
                </>
              ) : (
                <Spinner />
              )}
            </Stack>
          ) : (
            <Spinner size={'lg'} />
          )}
        </Stack>
      </PageRefresh>
    </>
  )
}
