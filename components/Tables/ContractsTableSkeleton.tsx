import { Box, Flex, Skeleton } from '@chakra-ui/react'

/** Placeholder for the registry table (md+). Hidden from assistive tech. */
export default function ContractsTableSkeleton({ count = 10 }: { count?: number }) {
  return (
    <Box aria-hidden display={{ base: 'none', md: 'block' }} border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden">
      <Box h="37px" bg="subtle" borderBottom="1px solid" borderColor="rule" />
      {Array.from({ length: count }).map((_, i) => (
        <Flex key={i} h="45px" px={4} align="center" gap={6} borderTop={i ? '1px solid' : undefined} borderColor="rule">
          <Skeleton h="12px" flex="1" maxW={`${220 + ((i * 37) % 120)}px`} />
          <Skeleton h="18px" w="120px" rounded="full" />
          <Skeleton h="12px" w="90px" ml="auto" />
        </Flex>
      ))}
    </Box>
  )
}
