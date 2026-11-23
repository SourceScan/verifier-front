import { useNetwork } from '@/contexts/NetworkContext'
import { Box, HStack } from '@chakra-ui/react'

export default function NetworkPill() {
  const { networkConfig } = useNetwork()
  return (
    <HStack as="span" display="inline-flex" spacing={1.5} px={2} py={0.5} rounded="full" border="1px solid" borderColor="rule" bg="surface" fontSize="xs" fontWeight="600" color="muted" lineHeight="1.4">
      <Box as="span" boxSize="7px" rounded="full" bg={networkConfig.backgroundColor} aria-hidden />
      <span>{networkConfig.name}</span>
    </HStack>
  )
}
