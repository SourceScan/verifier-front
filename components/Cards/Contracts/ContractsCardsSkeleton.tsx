import { bg, color } from '@/utils/theme'
import { Box, HStack, Skeleton, Stack, useColorMode } from '@chakra-ui/react'

import TableHeading from './TableHeading'

export default function ContractsCardsSkeleton({
  count = 5,
}: {
  count?: number
}) {
  const { colorMode } = useColorMode()

  return (
    <Stack
      w={'100%'}
      maxWidth="600px"
      spacing={'10'}
      display={{
        base: 'flex',
        md: 'none',
      }}
      minHeight="500px"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={`card-skeleton-${i}`}
          borderColor={'gray.500'}
          borderWidth={'1px'}
          rounded={'lg'}
          p={'4'}
          display={{ base: 'flex', md: 'none' }}
        >
          <Stack spacing={'4'} width={'full'}>
            <TableHeading label={'Contract'}>
              <Skeleton
                height="18px"
                width="70%"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'Block Height'}>
              <Skeleton
                height="18px"
                width="40%"
                alignSelf="flex-end"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'Code Hash'}>
              <Skeleton
                height="18px"
                width="55%"
                alignSelf="flex-end"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'CID'}>
              <Skeleton
                height="18px"
                width="70%"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'Approved'}>
              <Skeleton
                height="18px"
                width="20px"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <HStack spacing={3} justifyContent="center">
              <Skeleton
                height="32px"
                width="70px"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
                borderRadius="md"
              />
              <Skeleton
                height="32px"
                width="70px"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
                borderRadius="md"
              />
            </HStack>
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}
