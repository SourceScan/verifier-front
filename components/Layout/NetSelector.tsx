import { bg } from '@/utils/theme'
import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'

const networks = [
  { label: 'Testnet', href: 'https://testnet.sourcescan.dev' },
  { label: 'Mainnet', href: 'https://sourcescan.dev' },
]

export default function NetSelector() {
  const router = useRouter()
  const [network, setNetwork] = useState<{ label: string; href: string }>(
    process.env.NEXT_PUBLIC_NETWORK === 'testnet' ? networks[0] : networks[1]
  )
  const bgColor = useColorModeValue(bg.light, bg.dark)

  return (
    <Menu>
      <MenuButton
        as={Button}
        w={{ base: '50px', md: 'full' }}
        rightIcon={<ChevronDownIcon />}
        borderColor={'gray.500'}
        borderWidth={'1px'}
        rounded={'lg'}
        borderStyle={'dashed'}
        bg={bgColor}
        display={router.pathname.includes('code') ? 'none' : 'flex'}
      >
        <Text display={{ base: 'none', md: 'flex' }}>{network.label}</Text>
        <Text display={{ base: 'flex', md: 'none' }}>{network.label[0]}</Text>
      </MenuButton>
      <MenuList
        borderColor={'gray.500'}
        borderWidth={'1px'}
        rounded={'lg'}
        borderStyle={'dashed'}
        bg={bgColor}
      >
        {networks
          .filter((n) => n !== network)
          .map((n: { label: string; href: string }, i: number) => (
            <MenuItem
              key={i}
              value={n.label}
              onClick={() => router.push(n.href)}
              bg={bgColor}
            >
              {n.label}
            </MenuItem>
          ))}
      </MenuList>
    </Menu>
  )
}
