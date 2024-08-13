import { bg } from '@/utils/theme'
import { Button, Text, useColorModeValue } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'

const networks = [
  { label: 'Testnet', href: 'https://testnet.sourcescan.dev' },
  { label: 'Mainnet', href: 'https://v2.sourcescan.dev' },
]

export default function NetSelector() {
  const router = useRouter()
  const [network, setNetwork] = useState<{ label: string; href: string }>(
    process.env.NEXT_PUBLIC_NETWORK === 'testnet' ? networks[0] : networks[1]
  )
  const bgColor = useColorModeValue(bg.light, bg.dark)

  return (
    <Button
      w={{ base: '50px', md: 'full' }}
      borderColor={'gray.500'}
      borderWidth={'1px'}
      rounded={'lg'}
      borderStyle={'dashed'}
      bg={bgColor}
      display={router.pathname.includes('code') ? 'none' : 'flex'}
    >
      <Text display={{ base: 'none', md: 'flex' }}>{network.label}</Text>
      <Text display={{ base: 'flex', md: 'none' }}>{network.label[0]}</Text>
    </Button>
  )
}
