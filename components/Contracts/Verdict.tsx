import CopyButton from '@/components/Common/CopyButton'
import type { HashCheck, HashStatus } from '@/hooks/useCodeHashCheck'
import { Box, Button, Flex, Heading, HStack, Icon, Spinner, Text } from '@chakra-ui/react'
import type { IconType } from 'react-icons'
import { FiAlertTriangle, FiCheckCircle, FiMinusCircle, FiXCircle } from 'react-icons/fi'

const VERDICT: Record<HashStatus, { title: string; body: (_net: string) => string; icon?: IconType; tone: 'ok' | 'bad' | 'warn' | 'neutral' }> = {
  checking: {
    title: 'Checking the deployed code…',
    body: (net) => `Comparing the verified code hash with the code deployed on ${net} now.`,
    tone: 'neutral',
  },
  match: {
    title: 'Deployed code matches the verified source',
    body: (net) => `The code deployed on ${net} now has the same hash as the verified build.`,
    icon: FiCheckCircle,
    tone: 'ok',
  },
  mismatch: {
    title: 'Deployed code does not match the verified source',
    body: () => 'This account now runs different code. The source below is the verified build, not what is deployed.',
    icon: FiXCircle,
    tone: 'bad',
  },
  no_code: {
    title: 'No code is deployed on this account',
    body: () => 'The source below was verified, but nothing is deployed on this account now.',
    icon: FiMinusCircle,
    tone: 'bad',
  },
  unavailable: {
    title: 'The deployed code could not be checked',
    body: () => 'The RPC did not return this account’s code. This is neither a match nor a mismatch.',
    icon: FiAlertTriangle,
    tone: 'warn',
  },
}

const TONE = {
  ok: { fg: 'status.ok', bg: 'status.okBg', border: 'status.okBorder' },
  bad: { fg: 'status.bad', bg: 'status.badBg', border: 'status.badBorder' },
  warn: { fg: 'status.warn', bg: 'status.warnBg', border: 'status.warnBorder' },
  neutral: { fg: 'muted', bg: 'surface', border: 'rule' },
}

export const verdictTone = (status: HashStatus) => TONE[VERDICT[status].tone]

function HashLine(props: { label: string; value?: string; placeholder: string; copyLabel: string }) {
  return (
    <>
      <Box as="dt" color="muted" fontSize="sm" whiteSpace="nowrap">
        {props.label}
      </Box>
      <Box as="dd" minW={0}>
        {props.value ? (
          <HStack spacing={1} align="flex-start">
            <Text as="span" fontFamily="mono" fontSize="13px" wordBreak="break-all">
              {props.value}
            </Text>
            <CopyButton value={props.value} label={props.copyLabel} />
          </HStack>
        ) : (
          <Text as="span" fontSize="sm" color="muted">
            {props.placeholder}
          </Text>
        )}
      </Box>
    </>
  )
}

/** The one-glance answer above the source, with both hashes as its evidence. */
export default function Verdict(props: { check: HashCheck; verifiedHash: string; networkName: string; onRetry: () => void }) {
  const v = VERDICT[props.check.status]
  const tone = TONE[v.tone]
  const deployedPlaceholder =
    props.check.status === 'no_code' ? 'None — no code deployed' : props.check.status === 'unavailable' ? 'Not available' : 'Checking…'
  return (
    <Box role="status" aria-live="polite" border="1px solid" borderColor={tone.border} bg={tone.bg} rounded="lg" px={{ base: 4, md: 5 }} py={4}>
      <Flex gap={3} align="flex-start">
        <Box pt={0.5} color={tone.fg} flexShrink={0}>
          {v.icon ? <Icon as={v.icon} boxSize={6} aria-hidden /> : <Spinner size="sm" mt={1} mx={1} aria-hidden />}
        </Box>
        <Box flex="1" minW={0}>
          <Heading as="h2" fontSize={{ base: 'md', md: 'lg' }} fontWeight="650" color={tone.fg} lineHeight="1.35">
            {v.title}
          </Heading>
          <Text fontSize="sm" mt={0.5}>
            {v.body(props.networkName)}
          </Text>
          <Box as="dl" mt={3} display="grid" gridTemplateColumns={{ base: 'minmax(0, 1fr)', sm: 'auto minmax(0, 1fr)' }} columnGap={4} rowGap={1}>
            <HashLine label="Verified code hash" value={props.verifiedHash} placeholder="" copyLabel="Copy verified code hash" />
            <HashLine label="Deployed code hash" value={props.check.onChainHash} placeholder={deployedPlaceholder} copyLabel="Copy deployed code hash" />
          </Box>
        </Box>
        {props.check.status === 'unavailable' && (
          <Button size="sm" variant="quiet" onClick={props.onRetry} flexShrink={0}>
            Retry
          </Button>
        )}
      </Flex>
    </Box>
  )
}

/** Neutral placeholder with the verdict's footprint while the record loads. */
export function VerdictPending(props: { label: string }) {
  return (
    <Box role="status" border="1px solid" borderColor="rule" bg="surface" rounded="lg" px={{ base: 4, md: 5 }} py={4} minH="132px">
      <HStack spacing={3} color="muted">
        <Spinner size="sm" aria-hidden />
        <Text>{props.label}</Text>
      </HStack>
    </Box>
  )
}
