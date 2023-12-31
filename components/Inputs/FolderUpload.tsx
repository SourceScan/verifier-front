import { GithubDto } from '@/Interfaces/github/github.dto'
import { useWallet } from '@/hooks/useWallet'
import {
  Center,
  Checkbox,
  CheckboxGroup,
  HStack,
  Heading,
  Spinner,
  Stack,
  useToast,
} from '@chakra-ui/react'
import { RefObject, useEffect, useState } from 'react'

import api from '@/utils/apis/api'
import JSZip from 'jszip'
import ButtonInput from './ButtonInput'
import DefaultButton from './DefaultButton'

export default function FolderUpload(props: {
  handleUpload: (key: string, files: string[], github: GithubDto | null) => void
}) {
  const { wallet, publicKey } = useWallet()
  const toast = useToast()

  const [uploaded, setUploaded] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [files, setFiles] = useState<Array<File> | null>(null)
  const [checked, setChecked] = useState<Array<boolean> | null>(null)
  const handleChange = (ref: RefObject<HTMLInputElement>) => {
    const files = ref.current?.files as FileList
    if (files !== null && files !== undefined) {
      const arr_files = Array.from(files)
      const filtered = arr_files.filter((file: File) => {
        return (file.name.endsWith('.ts') ||
          file.name.endsWith('.rs') ||
          file.name.endsWith('Cargo.toml') ||
          file.name.endsWith('Cargo.lock') ||
          file.name.endsWith('package.json') ||
          file.name.endsWith('package-lock.json') ||
          file.name.endsWith('tsconfig.json')) &&
          !file.webkitRelativePath.includes('node_modules')
          ? true
          : false
      })
      setFiles(filtered)
      setChecked(filtered.map((file) => true))
    }
  }
  const handleUploadClick = () => {
    if (!files) return

    setUploading(true)
    const zip = new JSZip()

    const filtered = files.filter((file, i) =>
      checked && checked[i] ? true : false
    )
    filtered.forEach((file, i) => {
      zip.file(file.webkitRelativePath, file)
    })
    zip
      .generateAsync({ type: 'blob' })
      .then(function (content) {
        const formData = new FormData()
        formData.append('file', content)
        api
          .post('/api/temp/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          .then((res) => {
            props.handleUpload(res.data.key, res.data.files, null)
            setFiles(null)
            setUploaded(true)
          })
          .catch((err) => {
            console.log(err)
            toast({
              title: 'Error',
              description: 'Something went wrong',
              status: 'error',
              duration: 9000,
              position: 'bottom',
              isClosable: true,
            })
          })
      })
      .catch((e) => console.log(e))
    setUploading(false)
  }

  const handleCheckBoxChange = (e: any, i: number) => {
    if (!files) return

    setChecked(
      (prev: any) =>
        [
          ...prev.slice(0, i),
          e.target.checked,
          ...prev.slice(i + 1),
        ] as Array<boolean>
    )
  }

  useEffect(() => {
    if (files?.length === 0) {
      toast({
        title: 'No files found',
        description: 'Supported formats are .ts, .rs, .toml, .json',
        status: 'error',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
      setFiles(null)
    }
  }, [files])

  return (
    <Center display={uploaded ? 'none' : 'flex'}>
      <Stack align={'center'} justify={'center'} spacing={10}>
        <Heading
          display={wallet && !publicKey ? 'flex' : 'none'}
          fontSize={'sm'}
        >
          Add full access key for the deploying account
        </Heading>
        <HStack display={wallet && publicKey ? 'flex' : 'none'}>
          <ButtonInput handleChange={handleChange}>Select Folder</ButtonInput>
          <DefaultButton
            onClick={handleUploadClick}
            disabled={uploading}
            display={files ? 'flex' : 'none'}
            borderStyle={'solid'}
          >
            {uploading ? <Spinner /> : 'Upload'}
          </DefaultButton>
        </HStack>
        <Stack
          textAlign={'start'}
          w={'full'}
          borderColor={'gray.500'}
          borderWidth={'1px'}
          rounded={'lg'}
          borderStyle={'dashed'}
          p={2}
          display={!files ? 'none' : 'flex'}
        >
          <CheckboxGroup colorScheme={'green'}>
            {files?.map((file: File, i: number) => (
              <Checkbox
                key={`checkBox_${i}`}
                defaultChecked={true}
                onChange={(e) => handleCheckBoxChange(e, i)}
              >
                {file.webkitRelativePath}
              </Checkbox>
            ))}
          </CheckboxGroup>
        </Stack>
      </Stack>
    </Center>
  )
}
