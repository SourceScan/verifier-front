import { NETWORKS, NetworkType, useNetwork } from '@/contexts/NetworkContext'
import { Box, Button, HStack, Menu, MenuButton, MenuItemOption, MenuList, MenuOptionGroup } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { FiChevronDown } from 'react-icons/fi'

export default function NetSelector() {
  const router = useRouter()
  const { network, networkConfig, setNetwork } = useNetwork()
  return (
    <Menu>
      <MenuButton as={Button} variant="outline" size="sm" borderColor="rule" bg="surface" rightIcon={<FiChevronDown />} aria-label={`Network: ${networkConfig.name}`} sx={{ '@media (max-width: 374.98px)': { px: 2.5 } }}>
        <HStack as="span" spacing={2}><Box as="span" boxSize="8px" bg={networkConfig.backgroundColor} rounded="full" /><span>{networkConfig.name}</span></HStack>
      </MenuButton>
      <MenuList bg="surface">
        <MenuOptionGroup title="Network" type="radio" value={network} onChange={value => {
          if (typeof value === 'string' && (value === 'mainnet' || value === 'testnet') && value !== network) {
            setNetwork(value)
            void router.push('/')
          }
        }}>
          {(Object.keys(NETWORKS) as NetworkType[]).map(key =>
            <MenuItemOption key={key} value={key}>{NETWORKS[key].name}</MenuItemOption>)}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
