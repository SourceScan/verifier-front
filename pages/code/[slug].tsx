import FileSelectionDrawer from '@/components/Code/FileSelectionDrawer'
import PageHead from '@/components/Common/PageHead'
import api from '@/utils/apis/api'
import { formatSourceCodePath, lastSegment } from '@/utils/formatPath'
import { ascii_to_str } from '@/utils/near/ascii_converter'
import { rpc } from '@/utils/near/rpc'
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

  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [files, setFiles] = useState<any>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<any>(null)
  const [codeValue, setCodeValue] = useState<any>(null)

  useEffect(() => {
    if (!accountId) return

    // Fetch the contract data
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

  useEffect(() => {
    if (!data) return

    // Fetch the contract metadata
    axios
      .post(rpc, {
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
        api
          .get('/api/ipfs/structure', {
            params: {
              cid: data.cid,
              path: sourcePath,
            },
          })
          .then((res) => {
            setFiles(
              res.data.structure.filter((file: any) => file.type === 'file')
            )
          })
          .catch((err) => {
            console.log(err)
          })
      })
      .catch((err) => {
        console.log(err)
      })
  }, [data, accountId])

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
      <Stack alignItems={'center'} justifyContent={'center'} pt={'100px'}>
        {loading ? (
          <Spinner size={'xl'} />
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
            <Flex zIndex={20}>
              <CodeMirror
                editable={false}
                value={codeValue}
                height={'100%'}
                width={'95vw'}
                theme={colorMode}
                extensions={[rust()]}
              />
            </Flex>
          </>
        ) : (
          <Text>{accountId} not found</Text>
        )}
      </Stack>
    </>
  )
}
