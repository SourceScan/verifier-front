import { ascii_to_str } from '@/utils/near/ascii_converter'
import { rpc } from '@/utils/near/rpc'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Flex,
  HStack,
  Heading,
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
import api from '@/utils/apis/api'
import axios from 'axios'

export default function Contract() {
  const toast = useToast()
  const router = useRouter()
  const accountId = router.query.slug as string

  const [data, setData] = useState<any>(null)
  useEffect(() => {
    axios
      .post(rpc, {
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: process.env.NEXT_PUBLIC_CONTRACT,
          method_name: 'get_contract',
          args_base64: Buffer.from(`{"account_id": "${accountId}"}`).toString(
            'base64'
          ),
        },
      })
      .then((res) => {
        const str_res = ascii_to_str(res.data.result.result)
        const json_res = JSON.parse(str_res)
        setData(json_res)
      })
      .catch((err) => {
        console.log(err)
      })
  }, [accountId])

  console.log(data)

  const [wasmMatch, setWasmMatch] = useState<boolean | null>(null)
  const [wasmError, setWasmError] = useState<string | null>(null)
  const [txMatch, setTxMatch] = useState<boolean | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  useEffect(() => {
    if (!data) return

    axios
      .post(rpc, {
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'view_code',
          finality: 'final',
          account_id: accountId,
        },
      })
      .then((res) => {
        axios
          .get(
            `${process.env.NEXT_PUBLIC_API_HOST}/ipfs/${data.cid}/wasm_code_base64`
          )
          .then((res2) => {
            setWasmMatch(res2.data === res.data.result.code_base64)
          })
          .catch((err) => {
            setWasmError(err.message)
          })
      })
      .catch((err) => {
        setWasmError(err.message)
        setWasmMatch(false)
      })

    api
      .post('/api/ipfs/getTxHash', { cid: data.cid })
      .then((res) => {
        setTxMatch(res.data.tx_hash === data.deploy_tx)
      })
      .catch((err) => {
        setTxError(err.message)
        setTxMatch(false)
      })
  }, [data])

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
  }, [wasmError])

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
  }, [txError])

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
              w={{ base: '80%', md: '45%' }}
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
                    <Text>Wasm Code Matches</Text>
                  </HStack>
                ) : (
                  <HStack>
                    <CloseIcon />
                    <Text>Wasm Code Mismatches</Text>
                  </HStack>
                )}
                {txMatch === null ? (
                  <Spinner size={'sm'} />
                ) : txMatch ? (
                  <HStack>
                    <CheckIcon />
                    <Text>Deploy Tx Matches</Text>
                  </HStack>
                ) : (
                  <HStack>
                    <CloseIcon />
                    <Text>Deploy Tx Mismatches</Text>
                  </HStack>
                )}
              </Stack>
              <Stack spacing={'4'}>
                <DefaultHeading>Entry Point</DefaultHeading>
                <Text fontSize={{ base: 'md', md: 'lg' }}>
                  {data.entry_point}
                </Text>
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
            </Stack>
          ) : (
            <Spinner size={'lg'} />
          )}
        </Stack>
      </PageRefresh>
    </>
  )
}
