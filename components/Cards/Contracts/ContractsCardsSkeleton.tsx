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
                height="20px"
                width="80%"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'Block Height'}>
              <Skeleton
                height="20px"
                width="40%"
                alignSelf="flex-end"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'Code Hash'}>
              <Skeleton
                height="20px"
                width="60%"
                alignSelf="flex-end"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'CID'}>
              <Skeleton
                height="20px"
                width="90%"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <TableHeading label={'Approved'}>
              <Skeleton
                height="20px"
                width="24px"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
              />
            </TableHeading>
            <HStack spacing={3} justifyContent="center">
              <Skeleton
                height="36px"
                width="80px"
                startColor={colorMode === 'dark' ? color.dark : color.light}
                endColor={colorMode === 'dark' ? bg.dark : bg.light}
                borderRadius="md"
              />
              <Skeleton
                height="36px"
                width="80px"
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
