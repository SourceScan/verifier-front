import { Box, Skeleton, Stack } from '@chakra-ui/react'

/** Placeholder for the compact list (< md). Hidden from assistive tech. */
export default function ContractsCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Box aria-hidden display={{ base: 'block', md: 'none' }} border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden">
      {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
        <Stack key={i} spacing={2.5} px={4} py={3.5} borderTop={i ? '1px solid' : undefined} borderColor="rule">
          <Skeleton h="13px" w={`${55 + ((i * 17) % 35)}%`} />
          <Skeleton h="16px" w="45%" rounded="full" />
        </Stack>
      ))}
    </Box>
  )
}
