import FileSelectionDrawer from '@/components/Code/FileSelectionDrawer'
import PageHead from '@/components/Common/PageHead'
import { useNetwork } from '@/contexts/NetworkContext'
import { formatSourceCodePath, lastSegment } from '@/utils/formatPath'
import { ascii_to_str } from '@/utils/near/ascii_converter'
import { useRpcUrl } from '@/utils/near/rpc'
import {
  Flex,
  HStack,
  Spinner,
  Stack,
  Text,
  useColorMode,
} from '@chakra-ui/react'
import { rust } from '@codemirror/lang-rust'
import CodeMirror from '@uiw/react-codemirror'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Code() {
  const { colorMode } = useColorMode()
  const router = useRouter()
  const accountId = router.query.slug as string
  const { networkConfig } = useNetwork()
  const rpcUrl = useRpcUrl()

  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any>(null)
  const [_metadata, setMetadata] = useState<any>(null)
  const [files, setFiles] = useState<any>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<any>(null)
  const [codeValue, setCodeValue] = useState<any>(null)

  useEffect(() => {
    if (!accountId || !networkConfig) return

    // Determine which contract to use based on the network
    const contractAddress =
      typeof window !== 'undefined' &&
      localStorage.getItem('network') === 'testnet'
        ? process.env.NEXT_PUBLIC_CONTRACT_TESTNET
        : process.env.NEXT_PUBLIC_CONTRACT_MAINNET

    // Fetch the contract data
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

    // Fetch the contract metadata and code hash
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
      .then((codeRes) => {
        // Check if code hash matches
        if (codeRes.data.result.hash === data.code_hash) {
          console.log('Code hash matches')
        } else {
          console.log('Code hash does not match')
        }

        // Continue with metadata fetch
        return axios.post(
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
      })
      .then((res) => {
        const str_res = ascii_to_str(res.data.result.result)
        const json_res = JSON.parse(str_res)
        setMetadata(json_res)

        // Fetch file structure from IPFS based on metadata
        const sourcePath = formatSourceCodePath(
          json_res.build_info.contract_path,
          data.lang
        )

        // Add network information to headers
        const network = networkConfig.name.toLowerCase()

        axios
          .get(`${process.env.NEXT_PUBLIC_API_HOST}/api/ipfs/structure`, {
            params: {
              cid: data.cid,
              path: sourcePath,
            },
            headers: {
              'X-Network': network,
            },
          })
          .then((response) => {
            setFiles(
              response.data.structure.filter(
                (file: any) => file.type === 'file'
              )
            )
          })
          .catch((error) => {
            console.log(error)
          })
      })
      .catch((err) => {
        console.log(err)
      })
  }, [data, accountId, rpcUrl, networkConfig])

  useEffect(() => {
    if (!files || !data) return

    // Set the default file path to be displayed
    const entryName = data.lang === 'rust' ? 'lib.rs' : ''
    const entryFile = (files.filter((file: any) => file.name === entryName) ||
      files)[0]

    setSelectedFilePath(entryFile.path)
  }, [files, data])

  useEffect(() => {
    if (!selectedFilePath) return

    // Fetch the code content from IPFS
    axios
      .get(`${process.env.NEXT_PUBLIC_API_HOST}/ipfs/${selectedFilePath}`)
      .then((res) => {
        setCodeValue(res.data)
      })
      .catch((err) => {
        console.log(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [selectedFilePath])

  const handleFileSelection = (path: string) => {
    setLoading(true)
    setSelectedFilePath(path)
  }

  return (
    <>
      <PageHead title={'SourceScan CodeView'} />
      <Stack position="relative" width="100%" minHeight="calc(100vh - 200px)">
        {loading ? (
          <Flex justify="center" align="center" height="100%" width="100%">
            <Spinner size={'xl'} />
          </Flex>
        ) : data && codeValue ? (
          <>
            {selectedFilePath ? (
              <Flex
                position={'fixed'}
                zIndex={30}
                top={'18px'}
                left={{ base: '10px', lg: '40px' }}
              >
                <HStack
                  spacing={{ base: '0', lg: '2' }}
                  border={'1px dashed'}
                  rounded={'lg'}
                  borderColor={'gray.500'}
                  pr={'2'}
                  bg="rgba(0,0,0,0.7)"
                >
                  <FileSelectionDrawer
                    files={files}
                    handleFileSelection={handleFileSelection}
                    selectedFilePath={selectedFilePath}
                  />
                  <Text fontSize={'md'}>{lastSegment(selectedFilePath)}</Text>
                </HStack>
              </Flex>
            ) : null}
            <Flex zIndex={20} width="100%" height="100%" direction="column">
              <CodeMirror
                editable={false}
                value={codeValue}
                height="calc(100vh - 200px)"
                width="100%"
                theme={colorMode}
                extensions={[rust()]}
              />
            </Flex>
          </>
        ) : (
          <Flex justify="center" align="center" height="100%" width="100%">
            <Text>{accountId} not found</Text>
          </Flex>
        )}
      </Stack>
    </>
  )
}
