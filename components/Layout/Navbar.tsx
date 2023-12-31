import { links } from '@/utils/links'
import { bg } from '@/utils/theme'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { Box, Flex, HStack, useColorMode } from '@chakra-ui/react'

import Image from 'next/image'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import NavButton from './NavButton'
import NetSelector from './NetSelector'

export default function Navbar() {
  const router = useRouter()

  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <>
      <Box
        px={4}
        position={'fixed'}
        width={'100%'}
        zIndex={30}
        bg={colorMode === 'light' ? bg.light : bg.dark}
        top={0}
      >
        <HStack
          h={16}
          w={'100%'}
          align={'center'}
          justify={'center'}
          textAlign={'center'}
        >
          <Flex position={'absolute'} left={'5%'}>
            <NetSelector />
          </Flex>
          <HStack
            w={'100%'}
            align={'center'}
            justify={'center'}
            textAlign={'center'}
            display={{
              base: router.pathname.includes('code') ? 'none' : 'flex',
              lg: 'flex',
            }}
          >
            <NextLink href="/">
              <Flex>
                <Image
                  src={
                    'https://ipfs.io/ipfs/bafkreibfot4vz22olyjagjtr5qk7m4rpybwy3jb2x3bjfvjl5zzv3biluq'
                  }
                  draggable={false}
                  width={100}
                  height={100}
                  alt={'logo'}
                  style={
                    colorMode === 'dark'
                      ? {
                          WebkitFilter: 'invert(100%)',
                        }
                      : {}
                  }
                  loading={'eager'}
                />
              </Flex>
            </NextLink>
            <HStack
              as={'nav'}
              spacing={1}
              display={{ base: 'none', md: 'flex' }}
              rounded={'lg'}
            >
              {links.map((link) => (
                <NextLink key={link.label} href={link.href}>
                  <NavButton width={'24'}>{link.label}</NavButton>
                </NextLink>
              ))}
            </HStack>
          </HStack>
          <Flex position={'absolute'} right={'5%'}>
            <NavButton
              onClick={toggleColorMode}
              className={colorMode === 'light' ? 'moon-icon' : 'sun-icon'}
            >
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </NavButton>
          </Flex>
        </HStack>
      </Box>
    </>
  )
}
