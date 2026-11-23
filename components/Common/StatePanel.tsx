import { Box, Heading, Icon, Stack, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { FiAlertTriangle, FiInbox, FiSearch, FiXOctagon } from 'react-icons/fi'

const TONES = {
  empty: { icon: FiInbox, color: 'muted' },
  search: { icon: FiSearch, color: 'muted' },
  warning: { icon: FiAlertTriangle, color: 'status.warn' },
  error: { icon: FiXOctagon, color: 'status.bad' },
}

/** Empty / error / not-found states with a clear next action. */
export default function StatePanel(props: {
  tone: keyof typeof TONES
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  const tone = TONES[props.tone]
  return (
    <Box
      role={props.tone === 'error' ? 'alert' : 'status'}
      border="1px solid"
      borderColor="rule"
      rounded="lg"
      bg="surface"
      px={{ base: 5, md: 8 }}
      py={{ base: 8, md: 10 }}
      textAlign="center"
    >
      <Stack spacing={3} align="center" maxW="560px" mx="auto">
        <Icon as={tone.icon} boxSize={7} color={tone.color} aria-hidden />
        <Heading as="h2" size="md" wordBreak="break-word">
          {props.title}
        </Heading>
        {props.children && (
          <Text color="muted" wordBreak="break-word">
            {props.children}
          </Text>
        )}
        {props.action && <Box pt={2}>{props.action}</Box>}
      </Stack>
    </Box>
  )
}
