import NetworkBadge from '@/components/Common/NetworkBadge'
import { NETWORKS, NetworkType, useNetwork } from '@/contexts/NetworkContext'
import { bg } from '@/utils/theme'
import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'

export default function NetSelector() {
  const router = useRouter()
  const { network, setNetwork } = useNetwork()
  const bgColor = useColorModeValue(bg.light, bg.dark)

  const handleNetworkChange = (newNetwork: NetworkType) => {
    if (newNetwork !== network) {
      setNetwork(newNetwork)
      // Refresh the page to apply network changes
      router.reload()
    }
  }

  return (
    <Menu>
      <MenuButton
        as={Button}
        w={{ base: '50px', md: 'full' }}
        borderColor={'gray.500'}
        borderWidth={'1px'}
        rounded={'lg'}
        borderStyle={'dashed'}
        bg={bgColor}
        display={router.pathname.includes('code') ? 'none' : 'flex'}
        rightIcon={<ChevronDownIcon />}
      >
        <Box display="flex" alignItems="center">
          <Text display={{ base: 'none', md: 'flex' }} mr={1}>
            Network:
          </Text>
          <NetworkBadge size="sm" showLabel={false} />
        </Box>
      </MenuButton>
      <MenuList>
        {Object.entries(NETWORKS).map(([key, value]) => (
          <MenuItem
            key={key}
            onClick={() => handleNetworkChange(key as NetworkType)}
            fontWeight={network === key ? 'bold' : 'normal'}
          >
            <HStack>
              <Box
                w="10px"
                h="10px"
                rounded="full"
                bg={value.backgroundColor}
                mr={2}
              />
              <Text>{value.name}</Text>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}
