import {
  Box,
  Button,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
} from '@chakra-ui/react'
import React from 'react'
import { VscChevronDown, VscFile, VscFolder } from 'react-icons/vsc'

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
  selectedFilePath,
}) => {
  const { colorMode } = useColorMode()
  const selectedFile = files.find((file) => file.path === selectedFilePath)

  // Group files by directory for better organization
  const groupedFiles = files.reduce((acc: Record<string, File[]>, file) => {
    const pathParts = file.path.split('/')
    const directory = pathParts.length > 1 ? pathParts[0] : 'root'

    if (!acc[directory]) {
      acc[directory] = []
    }

    acc[directory].push(file)
    return acc
  }, {})

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<VscChevronDown />}
        leftIcon={<VscFile />}
        variant="outline"
        size="md"
        bg={colorMode === 'dark' ? '#28282B' : 'gray.100'}
        fontWeight="normal"
        width={{ base: 'full', md: 'auto' }}
      >
        {selectedFile ? selectedFile.name : 'Select File'}
      </MenuButton>
      <MenuList
        boxShadow="lg"
        zIndex={20}
        maxH="400px"
        overflowY="auto"
        bg={colorMode === 'dark' ? '#28282B' : 'gray.100'}
      >
        {Object.keys(groupedFiles).length > 1
          ? // If we have multiple directories, show them grouped
            Object.entries(groupedFiles).map(([directory, dirFiles]) => (
              <Box key={directory}>
                {directory !== 'root' && (
                  <Box
                    px={3}
                    py={2}
                    fontWeight="medium"
                    fontSize="sm"
                    color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                    borderBottomWidth="1px"
                    borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.100'}
                  >
                    <HStack>
                      <Icon as={VscFolder} />
                      <Text>{directory}</Text>
                    </HStack>
                  </Box>
                )}
                {dirFiles.map((file) => (
                  <MenuItem
                    key={file.path}
                    onClick={() => handleFileSelection(file.path)}
                    bg={colorMode === 'dark' ? '#28282B' : 'gray.100'}
                    icon={<VscFile />}
                    pl={directory !== 'root' ? 6 : 3}
                  >
                    {file.name}
                  </MenuItem>
                ))}
              </Box>
            ))
          : // If we only have one directory, show a flat list
            files.map((file) => (
              <MenuItem
                key={file.path}
                onClick={() => handleFileSelection(file.path)}
                bg={colorMode === 'dark' ? '#28282B' : 'gray.100'}
                icon={<VscFile />}
              >
                {file.name}
              </MenuItem>
            ))}
      </MenuList>
    </Menu>
  )
}

export default FileSelectionDrawer
