import { links } from '@/utils/links'
import { bg } from '@/utils/theme'
import { Box, Flex, HStack, useColorModeValue } from '@chakra-ui/react'

import NextLink from 'next/link'
import NavButton from './NavButton'

export default function Footer() {
  return (
    <>
      <Box
        px={4}
        position={'fixed'}
        bottom={0}
        width={'100%'}
        zIndex={30}
        bg={useColorModeValue(bg.light, bg.dark)}
        alignItems={'center'}
        justifyContent={'center'}
        display={{ base: 'flex', md: 'none' }}
      >
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
          <HStack userSelect="none" as={'nav'} spacing={1}>
            {links.map((link) => (
              <NextLink key={link.label} href={link.href}>
                <NavButton width="24">{link.label}</NavButton>
              </NextLink>
            ))}
          </HStack>
        </Flex>
      </Box>
    </>
  )
}
