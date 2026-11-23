import { Box, Flex, Heading } from '@chakra-ui/react'
import { ReactNode } from 'react'

/** Bordered section with a title strip; content rows carry their own padding. */
export function Panel(props: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <Box as="section" aria-label={props.title} border="1px solid" borderColor="rule" rounded="lg" bg="surface" minW={0} overflow="hidden">
      <Flex px={{ base: 4, md: 5 }} py={3} borderBottom="1px solid" borderColor="rule" align="center" justify="space-between" gap={3}>
        <Heading as="h2" fontSize="sm" fontWeight="700">
          {props.title}
        </Heading>
        {props.aside}
      </Flex>
      {props.children}
    </Box>
  )
}

/** Explorer-style key/value list (stacks below md). */
export function Fields(props: { children: ReactNode }) {
  return <Box as="dl">{props.children}</Box>
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <Box display="grid" gridTemplateColumns={{ base: 'minmax(0, 1fr)', md: '180px minmax(0, 1fr)' }} columnGap={4} rowGap={1} px={{ base: 4, md: 5 }} py={3} borderTop="1px solid" borderColor="rule" _first={{ borderTop: 'none' }}>
      <Box as="dt" fontSize="sm" color="muted">
        {props.label}
      </Box>
      <Box as="dd" minW={0} fontSize="sm" wordBreak="break-word">
        {props.children}
      </Box>
    </Box>
  )
}
