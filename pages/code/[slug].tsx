import FileSelectionDrawer from '@/components/Code/FileSelectionDrawer'
import PageHead from '@/components/Common/PageHead'
import { useNetwork } from '@/contexts/NetworkContext'
import { detectNetworkFromAddress } from '@/utils/detectNetwork'
import { ascii_to_str } from '@/utils/near/ascii_converter'
import { useRpcUrl } from '@/utils/near/rpc'
import { bg, color } from '@/utils/theme'
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
  const { networkConfig, network, setNetwork } = useNetwork()
  const rpcUrl = useRpcUrl()

  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any>(null)
  const [_metadata, setMetadata] = useState<any>(null)
  const [files, setFiles] = useState<any>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<any>(null)
  const [codeValue, setCodeValue] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [networkDetected, setNetworkDetected] = useState(false)

  // Step 1: Detect network from contract address and switch if necessary
  useEffect(() => {
    if (accountId) {
      // Check if the TLD is valid (.near or .testnet)
      const isValidTLD =
        accountId.endsWith('.near') || accountId.endsWith('.testnet')
      if (!isValidTLD) {
        console.log(`Code page: Invalid TLD for contract: ${accountId}`)
        setLoading(false)
        setErrorMessage(
          `Invalid contract address: ${accountId}. Contract addresses must end with .near or .testnet`
        )
        return
      }

      const detectedNetwork = detectNetworkFromAddress(accountId)
      if (detectedNetwork && detectedNetwork !== network) {
        console.log(
          `Code page: Detected ${detectedNetwork} contract, switching networks from ${network}`
        )
        setNetwork(detectedNetwork)
      } else {
        // If no network switch needed, mark detection as complete
        setNetworkDetected(true)
      }
    }
  }, [accountId, network]) // Include network to detect when the switch completes

  // Mark network detection as complete after a network change
  useEffect(() => {
    if (accountId && !networkDetected) {
      const detectedNetwork = detectNetworkFromAddress(accountId)
      if (!detectedNetwork || detectedNetwork === network) {
        setNetworkDetected(true)
      }
    }
  }, [network, accountId, networkDetected])

  // Step 2: Add timeout to prevent infinite loading and only fetch after network detection
  useEffect(() => {
    if (!accountId || !networkConfig || !networkDetected) return

    // Create a timeout to ensure loading isn't stuck forever
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout triggered after 15 seconds')
        setLoading(false)
      }
    }, 15000) // 15 second timeout

    return () => clearTimeout(timeoutId)
  }, [loading, accountId, networkConfig])

  useEffect(() => {
    if (!accountId || !networkConfig || !networkDetected) return

    console.log(
      `Code page: Fetching contract data for ${accountId} on ${networkConfig.name}`
    )

    // Use the current network's contract address from the context
    const contractAddress = networkConfig.contract
    console.log(`Using contract address: ${contractAddress}`)

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!data) {
        console.log('Code page: Loading timeout triggered after 15 seconds')
        setLoading(false)
      }
    }, 15000)

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
        console.log('Code page: Contract data response received')
        const str_res = ascii_to_str(res.data.result.result)
        const json_res = JSON.parse(str_res)
        console.log('Code page: Contract data parsed successfully')
        setData(json_res)
        clearTimeout(timeoutId)
      })
      .catch((err) => {
        // Show error and stop loading
        console.error('Error fetching contract data:', err)
        setErrorMessage(`Failed to load contract data: ${err.message}`)
        setLoading(false)
        clearTimeout(timeoutId)
      })

    return () => clearTimeout(timeoutId)
  }, [accountId, rpcUrl, networkConfig, networkDetected])

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
        // Check if code hash matches (no need to log) with proper null checking
        let codeHashMatches = false
        try {
          if (
            codeRes &&
            codeRes.data &&
            codeRes.data.result &&
            codeRes.data.result.hash
          ) {
            codeHashMatches = codeRes.data.result.hash === data.code_hash
          }
        } catch (error) {
          console.error('Error comparing code hashes:', error)
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
        let sourcePath = '/'
        try {
          // Add proper error handling for metadata parsing
          if (
            !res ||
            !res.data ||
            !res.data.result ||
            !res.data.result.result
          ) {
            console.error('Invalid metadata response structure')
            throw new Error('Invalid metadata response')
          }

          const str_res = ascii_to_str(res.data.result.result)
          const json_res = JSON.parse(str_res)
          setMetadata(json_res)

          // Use the contract_path if available, otherwise use root path "/"
          sourcePath = json_res.build_info?.contract_path || '/'
        } catch (error) {
          console.error('Error parsing metadata:', error)
          // Continue with default path
        }

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
            // Ensure we handle both array and object responses
            // Handle different possible response structures from IPFS
            let structure: any[] = []
            if (response.data.structure) {
              structure = Array.isArray(response.data.structure)
                ? response.data.structure
                : [response.data.structure]
            } else if (Array.isArray(response.data)) {
              structure = response.data
            } else if (response.data && typeof response.data === 'object') {
              structure = [response.data]
            }

            // Filter to only include .rs and .toml files from the top level
            const filteredFiles = structure.filter((file: any) => {
              return (
                file.type === 'file' &&
                (file.name.endsWith('.rs') || file.name.endsWith('.toml'))
              )
            })

            // Process folders one level deep (non-recursive to avoid too many requests)
            const processFolders = async () => {
              let allFiles = [...filteredFiles]

              // Get all directories
              const directories = structure.filter(
                (item: any) => item.type === 'dir'
              )

              // Process each directory
              for (const dir of directories) {
                try {
                  const folderResponse = await axios.get(`/api/proxy-ipfs`, {
                    params: {
                      endpoint: 'structure',
                      cid: data.cid,
                      path: dir.path,
                    },
                    headers: {
                      'X-Network': network,
                    },
                  })

                  // Extract folder items
                  let folderItems: any[] = []
                  if (folderResponse.data.structure) {
                    folderItems = Array.isArray(folderResponse.data.structure)
                      ? folderResponse.data.structure
                      : [folderResponse.data.structure]
                  } else if (Array.isArray(folderResponse.data)) {
                    folderItems = folderResponse.data
                  } else if (
                    folderResponse.data &&
                    typeof folderResponse.data === 'object'
                  ) {
                    folderItems = [folderResponse.data]
                  }

                  // Filter for .rs and .toml files and add them with folder prefix
                  const folderFiles = folderItems
                    .filter(
                      (file: any) =>
                        file.type === 'file' &&
                        (file.name.endsWith('.rs') ||
                          file.name.endsWith('.toml'))
                    )
                    .map((file: any) => ({
                      ...file,
                      displayName: `${dir.name}/${file.name}`,
                    }))

                  allFiles = [...allFiles, ...folderFiles]
                } catch (error) {
                  // Skip folders that can't be processed
                }
              }

              return allFiles
            }

            // Process folders and set files
            processFolders()
              .then((allFiles) => {
                setFiles(allFiles)
              })
              .catch(() => {
                setFiles([])
              })
          })
          .catch((err) => {
            // Log the error and set empty files array
            console.error('Error fetching IPFS structure:', err)
            setErrorMessage(
              `IPFS error: ${err.message || 'Failed to access IPFS'}`
            )
            setFiles([])
          })
      })
      .catch((err) => {
        // Handle error and stop loading
        console.error('Error fetching metadata:', err)
        setErrorMessage(`Failed to fetch contract metadata: ${err.message}`)
        setLoading(false)
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
      setSelectedFilePath(entryFile.path)
    } else {
      // No valid file found
      setLoading(false)
    }
  }, [files, data])

  useEffect(() => {
    if (!selectedFilePath || !data || !data.cid) return

    // Fetch the code content from IPFS
    // Extract clean file path from the full path (which might include the CID)
    let filePath = selectedFilePath

    // If the path includes the CID, extract just the path portion
    if (filePath.includes(data.cid)) {
      // Extract the part after the CID
      const cidIndex = filePath.indexOf(data.cid)
      if (cidIndex !== -1) {
        filePath = filePath.substring(cidIndex + data.cid.length + 1) // +1 for the slash
      }
    }

    // With our updated proxy implementation, the endpoint will properly handle the URL construction
    axios
      .get(`/api/proxy-ipfs`, {
        params: {
          endpoint: 'file',
          cid: data.cid,
          path: filePath,
        },
        headers: {
          'X-Network': networkConfig.name.toLowerCase(),
        },
      })
      .then((res) => {
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
      .catch(() => {
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

  // Add a state for invalid TLD error
  const [invalidTLD, setInvalidTLD] = useState(false)

  // Update the TLD validation to set the invalidTLD state
  useEffect(() => {
    if (accountId) {
      // Check if the TLD is valid (.near or .testnet)
      const isValidTLD =
        accountId.endsWith('.near') || accountId.endsWith('.testnet')
      if (!isValidTLD) {
        console.log(`Code page: Invalid TLD for contract: ${accountId}`)
        setLoading(false)
        setErrorMessage(
          `Invalid contract address: ${accountId}. Contract addresses must end with .near or .testnet`
        )
        setInvalidTLD(true)
        return
      }

      const detectedNetwork = detectNetworkFromAddress(accountId)
      if (detectedNetwork && detectedNetwork !== network) {
        console.log(
          `Code page: Detected ${detectedNetwork} contract, switching networks from ${network}`
        )
        setNetwork(detectedNetwork)
      } else {
        // If no network switch needed, mark detection as complete
        setNetworkDetected(true)
      }
    }
  }, [accountId]) // Only depend on accountId to avoid re-running when network changes

  return (
    <>
      <PageHead title={'SourceScan CodeView'} />
      <Stack position="relative" width="100%" minHeight="calc(100vh - 200px)">
        {invalidTLD ? (
          <Flex
            justify="center"
            align="center"
            height="calc(100vh - 200px)"
            width="100%"
            direction="column"
            gap={4}
          >
            <Text
              fontSize="lg"
              fontWeight="medium"
              textAlign="center"
              color="red.500"
            >
              Invalid contract address: {accountId}
            </Text>
            <Text
              fontSize="md"
              color="gray.500"
              textAlign="center"
              maxW="600px"
            >
              Contract addresses must end with .near or .testnet
            </Text>
          </Flex>
        ) : loading ? (
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
              color={colorMode === 'dark' ? color.dark : color.light}
            />
            <Text
              fontSize="lg"
              fontWeight="medium"
              color={colorMode === 'dark' ? color.dark : color.light}
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
                borderBottomWidth="2px"
                borderTopWidth={'2px'}
                color={colorMode === 'dark' ? color.dark : color.light}
                bg={colorMode === 'dark' ? bg.dark : bg.light}
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
                  <HStack
                    spacing={4}
                    color={colorMode === 'dark' ? color.dark : color.light}
                    bg={colorMode === 'dark' ? bg.dark : bg.light}
                    p={2}
                    borderRadius="md"
                  >
                    <Text fontSize="lg" fontWeight="medium">
                      Contract Code
                    </Text>
                    <Text
                      fontSize="md"
                      opacity={0.8}
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
                color={colorMode === 'dark' ? color.dark : color.light}
                bg={colorMode === 'dark' ? bg.dark : bg.light}
                borderRadius="md"
                overflow="hidden"
                boxShadow="sm"
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
          <Flex
            justify="center"
            align="center"
            height="calc(100vh - 200px)"
            width="100%"
            direction="column"
            gap={4}
          >
            <Text
              fontSize="lg"
              fontWeight="medium"
              textAlign="center"
              color="red.500"
            >
              {!data
                ? `Contract "${accountId}" not found`
                : !files || files.length === 0
                ? "No source code files available. IPFS may be unavailable or the contract's source code is not published."
                : 'Failed to load contract source code'}
            </Text>
            {/* Display the specific error message if any */}
            {errorMessage && (
              <Text
                fontSize="md"
                color="gray.500"
                textAlign="center"
                maxW="600px"
              >
                {errorMessage}
              </Text>
            )}
            {data && (
              <Text
                fontSize="md"
                color="gray.500"
                textAlign="center"
                maxW="600px"
              >
                Try refreshing the page or check if the contract has its source
                code published on IPFS.
              </Text>
            )}
          </Flex>
        )}
      </Stack>
    </>
  )
}
