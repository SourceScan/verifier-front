import { bg } from '@/utils/theme'
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  HStack,
  Radio,
  RadioGroup,
  Stack,
  Text,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react'
import React from 'react'
import { VscFile, VscListSelection } from 'react-icons/vsc'

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
      <Button
        bg={bg[colorMode]}
        onClick={onOpen}
        rounded={'lg'}
        size={'sm'}
        borderWidth="1px"
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
        _hover={{ bg: colorMode === 'dark' ? 'gray.700' : 'gray.200' }}
        aria-label="Select File"
        title="Select File"
      >
        <VscListSelection size={'18'} />
      </Button>

      <Drawer isOpen={isOpen} placement={'left'} onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent bg={bg[colorMode]}>
          <DrawerBody py={6} px={4}>
            <Text fontSize="xl" fontWeight="bold" mb={4}>
              Source Files
            </Text>

            <RadioGroup onChange={handleFileSelection} value={selectedFilePath}>
              <Stack spacing={2}>
                {files.map((file) => (
                  <Radio
                    key={file.path}
                    value={file.path}
                    py={2}
                    px={3}
                    borderRadius="md"
                    _checked={{
                      bg: colorMode === 'dark' ? 'blue.800' : 'blue.50',
                      borderColor: 'blue.500',
                    }}
                    size="md"
                  >
                    <HStack spacing={2}>
                      <VscFile />
                      <Text>{file.name}</Text>
                    </HStack>
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
