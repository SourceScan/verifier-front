import FileSelectionDrawer from '@/components/Code/FileSelectionDrawer'
import PageHead from '@/components/Common/PageHead'
import { useNetwork } from '@/contexts/NetworkContext'
import { formatSourceCodePath, lastSegment } from '@/utils/formatPath'
import { ascii_to_str } from '@/utils/near/ascii_converter'
import { useRpcUrl } from '@/utils/near/rpc'
import {
  Box,
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
          .get(`/api/proxy-ipfs`, {
            params: {
              endpoint: 'structure',
              cid: data.cid,
              path: sourcePath,
            },
            headers: {
              'X-Network': network,
            },
          })
          .then((response) => {
            console.log('IPFS structure response:', response.data)
            // Ensure we handle both array and object responses
            const structure = Array.isArray(response.data.structure)
              ? response.data.structure
              : response.data.structure
              ? [response.data.structure]
              : []

            setFiles(structure.filter((file: any) => file.type === 'file'))
          })
          .catch((error) => {
            console.error('IPFS structure error:', error)
            // Set empty files array on error to avoid null reference
            setFiles([])
          })
      })
      .catch((err) => {
        console.log(err)
      })
  }, [data, accountId, rpcUrl, networkConfig])

  useEffect(() => {
    if (!files || !data || !Array.isArray(files) || files.length === 0) return

    // Set the default file path to be displayed
    const entryName = data.lang === 'rust' ? 'lib.rs' : ''
    // Find the entry file or use the first available file
    const filteredFiles = files.filter((file: any) => file.name === entryName)
    const entryFile = filteredFiles.length > 0 ? filteredFiles[0] : files[0]

    if (entryFile && entryFile.path) {
      console.log('Setting selected file path:', entryFile.path)
      setSelectedFilePath(entryFile.path)
    } else {
      console.error('Unable to find a valid file to display')
      setLoading(false)
    }
  }, [files, data])

  useEffect(() => {
    if (!selectedFilePath || !data || !data.cid) return

    // Fetch the code content from IPFS
    // Add cid as a query parameter since it may not be included in the path
    console.log('Fetching file content:', selectedFilePath, 'CID:', data.cid)

    axios
      .get(`/api/proxy-ipfs`, {
        params: {
          endpoint: 'file',
          cid: data.cid,
          path: selectedFilePath,
        },
        headers: {
          'X-Network': networkConfig.name.toLowerCase(),
        },
      })
      .then((res) => {
        console.log('File content response:', res.data)
        setCodeValue(res.data.content || res.data)
      })
      .catch((err) => {
        console.error('Error fetching file content:', err)
        setCodeValue('Error loading file content. Please try again.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [selectedFilePath, data, networkConfig])

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
          <Stack width="100%" pt="70px" spacing={0}>
            {selectedFilePath && (
              <Flex
                width="100%"
                justifyContent="center"
                py={2}
                borderBottomWidth="1px"
                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.100'}
                position="sticky"
                top="64px"
                zIndex={10}
                boxShadow="sm"
              >
                <HStack
                  spacing={{ base: '2', lg: '3' }}
                  rounded={'md'}
                  px={{ base: 2, md: 4 }}
                  py={2}
                  maxW="1200px"
                  width="100%"
                  ml={{ base: 2, md: 0 }}
                  mr={{ base: 2, md: 0 }}
                >
                  <FileSelectionDrawer
                    files={files}
                    handleFileSelection={handleFileSelection}
                    selectedFilePath={selectedFilePath}
                  />
                  <Text fontSize={'md'} fontWeight="medium" isTruncated>
                    {lastSegment(selectedFilePath)}
                  </Text>
                </HStack>
              </Flex>
            )}
            <Flex
              width="100%"
              direction="column"
              flex={1}
              px={{ base: 0, md: 4 }}
              py={2}
            >
              <Box
                borderWidth="1px"
                borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                borderRadius="md"
                overflow="hidden"
              >
                <CodeMirror
                  editable={false}
                  value={codeValue}
                  height="calc(100vh - 150px)"
                  width="100%"
                  theme={colorMode}
                  extensions={[rust()]}
                />
              </Box>
            </Flex>
          </Stack>
        ) : (
          <Flex justify="center" align="center" height="100%" width="100%">
            <Text>{accountId} not found</Text>
          </Flex>
        )}
      </Stack>
    </>
  )
}
