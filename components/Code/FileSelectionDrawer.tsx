import {
  Button,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
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
  const selectedFile = files.find((file) => file.path === selectedFilePath)
  const selectedName = selectedFile
    ? selectedFile.displayName || selectedFile.name
    : 'Select file'

  // Sort files by display name (which includes folder path) for better organization
  const sortedFiles = [...files].sort((a, b) =>
    (a.displayName || a.name).localeCompare(b.displayName || b.name)
  )

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<VscChevronDown aria-hidden />}
        leftIcon={<VscFile aria-hidden />}
        variant="outline"
        size="sm"
        bg="surface"
        borderColor="rule"
        fontWeight="normal"
        fontFamily="mono"
        width={{ base: 'full', sm: 'auto' }}
        maxW={{ sm: '320px' }}
        aria-label={`Source file: ${selectedName}. ${files.length} files`}
      >
        {selectedName}
      </MenuButton>
      <MenuList bg="surface" zIndex={20} maxH="60vh" overflowY="auto">
        <MenuOptionGroup
          title={`${files.length} files`}
          type="radio"
          value={selectedFilePath}
          onChange={(value) => typeof value === 'string' && handleFileSelection(value)}
        >
          {sortedFiles.map((file) => (
            <MenuItemOption key={file.path} value={file.path} bg="surface" fontFamily="mono" fontSize="sm">
              {file.displayName || file.name}
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}

export default FileSelectionDrawer
