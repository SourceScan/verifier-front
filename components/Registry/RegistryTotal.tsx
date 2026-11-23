import type { RegistryCount } from '@/hooks/useRegistry'
import { Button, HStack, Spinner, Text } from '@chakra-ui/react'

const formatCount = new Intl.NumberFormat('en-US')

/**
 * Total verified contracts on the selected network. Loading, zero and an
 * unavailable count read differently, and none of them shows a number from
 * another network.
 */
export default function RegistryTotal(props: { count: RegistryCount; networkName: string; onRetry: () => void }) {
  const { count, networkName } = props
  return (
    <HStack mt={3} minH="22px" spacing={2} rowGap={1} flexWrap="wrap" fontSize="sm" color="muted" data-registry-total={count.status} aria-busy={count.status === 'loading'}>
      {count.status === 'loading' && (
        <>
          <Spinner size="xs" aria-hidden />
          <Text as="span">Counting verified contracts on {networkName}…</Text>
        </>
      )}
      {count.status === 'ready' && (
        <Text as="span">
          <Text as="span" color="ink" fontWeight="650" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCount.format(count.count)}
          </Text>{' '}
          {count.count === 1 ? 'contract' : 'contracts'} verified on {networkName}
        </Text>
      )}
      {count.status === 'unavailable' && (
        <>
          <Text as="span">Verified contract count unavailable for {networkName}.</Text>
          <Button variant="link" size="sm" color="accent" onClick={props.onRetry}>
            Try again
          </Button>
        </>
      )}
    </HStack>
  )
}
