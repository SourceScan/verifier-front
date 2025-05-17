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
      // Redirect to home page instead of just reloading
      router.push('/').then(() => {
        // Force a hard refresh to ensure clean state
        window.location.reload()
      })
    }
  }

  return (
    <Menu>
      <MenuButton
        as={Button}
        w={{ base: 'auto', md: 'full' }}
        minW={{ base: '40px', md: 'auto' }}
        h={{ base: '36px', md: '40px' }}
        borderColor={'gray.500'}
        borderWidth={'1px'}
        rounded={'lg'}
        borderStyle={'dashed'}
        bg={bgColor}
        display={'flex'}
        rightIcon={<ChevronDownIcon display={{ base: 'none', md: 'flex' }} />}
        px={{ base: 2, md: 4 }}
        py={{ base: 1, md: 2 }}
      >
        <Box display="flex" alignItems="center" justifyContent="center">
          <Text display={{ base: 'none', md: 'flex' }} mr={1}>
            Network:
          </Text>
          <NetworkBadge
            size={{ base: 'md', md: 'sm' }}
            showLabel={{ base: true, md: false }}
          />
        </Box>
      </MenuButton>
      <MenuList>
        {Object.entries(NETWORKS).map(([key, value]) => (
          <MenuItem
            key={key}
            onClick={() => handleNetworkChange(key as NetworkType)}
            fontWeight={network === key ? 'bold' : 'normal'}
            bg={network === key ? value.backgroundColor + '20' : undefined}
            _hover={{
              bg: network === key ? value.backgroundColor + '20' : undefined,
            }}
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
