import { bg } from '@/utils/theme'
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Radio,
  RadioGroup,
  Stack,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react'
import React from 'react'
import { VscListSelection } from 'react-icons/vsc'
import DefaultTooltip from '../Common/DefaultTooltip'

// Define the type for the file object
interface File {
  path: string
  name: string
}

// Define the props for the FileSelectionDrawer component
interface FileSelectionDrawerProps {
  files: File[]
  handleFileSelection: (_value: string) => void
  selectedFilePath: string
}

const FileSelectionDrawer: React.FC<FileSelectionDrawerProps> = ({
  files,
  handleFileSelection,
  selectedFilePath: _value,
}) => {
  const selectedFilePath = _value // Rename to avoid unused variable warning
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { colorMode } = useColorMode()

  return (
    <>
      <DefaultTooltip label={'Select File'} placement={'bottom'}>
        <Button bg={bg[colorMode]} onClick={onOpen} rounded={'lg'} size={'sm'}>
          <VscListSelection size={'22'} />
        </Button>
      </DefaultTooltip>

      <Drawer isOpen={isOpen} placement={'left'} onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody bg={bg[colorMode]}>
            <RadioGroup onChange={handleFileSelection} value={selectedFilePath}>
              <Stack spacing={'8'} pt={'100'} bg={bg[colorMode]}>
                {files.map((file) => (
                  <Radio key={file.path} value={file.path}>
                    {file.name}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export default FileSelectionDrawer
