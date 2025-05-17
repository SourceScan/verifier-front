import FileSelectionDrawer from '@/components/Code/FileSelectionDrawer'
import PageHead from '@/components/Common/PageHead'
import { useNetwork } from '@/contexts/NetworkContext'
import { formatSourceCodePath } from '@/utils/formatPath'
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

    // Ensure we're using the current network from the context
    // which is properly initialized from localStorage
    const contractAddress = networkConfig.contract

    console.log('Fetching contract data for network:', networkConfig.name)

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
            // Handle different possible response structures from IPFS
            let structure = []
            if (response.data.structure) {
              structure = Array.isArray(response.data.structure)
                ? response.data.structure
                : [response.data.structure]
            } else if (Array.isArray(response.data)) {
              structure = response.data
            } else if (response.data && typeof response.data === 'object') {
              structure = [response.data]
            }

            console.log('Processed IPFS structure:', structure)

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
        // Handle different response formats
        if (res.data && typeof res.data === 'object') {
          if (res.data.content) {
            setCodeValue(res.data.content)
          } else {
            // If it's an object without content property, try to stringify it
            setCodeValue(JSON.stringify(res.data, null, 2))
          }
        } else if (typeof res.data === 'string') {
          setCodeValue(res.data)
        } else {
          setCodeValue('Unable to parse file content properly.')
        }
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
          <Flex
            justify="center"
            align="center"
            height="calc(100vh - 200px)"
            width="100%"
            direction="column"
            gap={4}
          >
            <Spinner
              size="xl"
              thickness="4px"
              speed="0.8s"
              color={colorMode === 'dark' ? 'blue.400' : 'teal.500'}
            />
            <Text
              fontSize="lg"
              fontWeight="medium"
              color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
              textAlign="center"
            >
              Loading Contract Code...
            </Text>
          </Flex>
        ) : data && codeValue ? (
          <Stack width="100%" pt="70px" spacing={0}>
            {selectedFilePath && (
              <Box
                width="100%"
                borderBottomWidth="1px"
                borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                position="sticky"
                top="64px"
                zIndex={10}
                boxShadow="sm"
              >
                <Flex
                  justify="space-between"
                  align="center"
                  maxW="1200px"
                  width="100%"
                  mx="auto"
                  px={{ base: 4, md: 6 }}
                  py={3}
                >
                  <HStack spacing={4}>
                    <Text
                      fontSize="lg"
                      fontWeight="medium"
                      color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}
                    >
                      Contract Code
                    </Text>
                    <Text
                      fontSize="md"
                      color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
                      display={{ base: 'none', md: 'block' }}
                    >
                      {accountId}
                    </Text>
                  </HStack>
                  <FileSelectionDrawer
                    files={files}
                    handleFileSelection={handleFileSelection}
                    selectedFilePath={selectedFilePath}
                  />
                </Flex>
              </Box>
            )}
            <Box
              width="100%"
              maxW="1200px"
              mx="auto"
              px={{ base: 4, md: 6 }}
              py={4}
            >
              <Box
                borderWidth="1px"
                borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                borderRadius="md"
                overflow="hidden"
                boxShadow="sm"
                bg={colorMode === 'dark' ? 'gray.900' : 'white'}
              >
                <CodeMirror
                  editable={false}
                  value={codeValue}
                  height="calc(100vh - 180px)"
                  width="100%"
                  theme={colorMode}
                  extensions={[rust()]}
                  style={{
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                />
              </Box>
            </Box>
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
