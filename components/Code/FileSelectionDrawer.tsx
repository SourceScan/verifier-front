import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useColorMode,
} from '@chakra-ui/react'
import React from 'react'
import { VscChevronDown, VscFile } from 'react-icons/vsc'

// Define the type for the file object
interface File {
  path: string
  name: string
  displayName?: string // Optional display name that includes folder path
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

  // Sort files by display name (which includes folder path) for better organization
  const sortedFiles = [...files].sort((a, b) => {
    // Use displayName if available, otherwise fall back to name
    const aName = a.displayName || a.name
    const bName = b.displayName || b.name
    return aName.localeCompare(bName)
  })

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
        {selectedFile
          ? selectedFile.displayName || selectedFile.name
          : 'Select File'}
      </MenuButton>
      <MenuList
        boxShadow="lg"
        zIndex={20}
        maxH="400px"
        overflowY="auto"
        bg={colorMode === 'dark' ? '#28282B' : 'gray.100'}
      >
        {/* Always show as a flat list, sorted alphabetically */}
        {sortedFiles.map((file) => (
          <MenuItem
            key={file.path}
            onClick={() => handleFileSelection(file.path)}
            bg={colorMode === 'dark' ? '#28282B' : 'gray.100'}
            icon={<VscFile />}
          >
            {file.displayName || file.name}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}

export default FileSelectionDrawer
