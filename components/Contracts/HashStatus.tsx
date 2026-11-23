import type { NetworkType } from '@/contexts/NetworkContext'
import {
  HashCheck,
  HashStatus as Status,
  useCodeHashCheck,
} from '@/hooks/useCodeHashCheck'
import { Box, HStack, Icon, Spinner, Text, Tooltip } from '@chakra-ui/react'
import type { IconType } from 'react-icons'
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiMinusCircle,
  FiXCircle,
} from 'react-icons/fi'

const STATUS: Record<
  Status,
  { label: string; detail: string; icon?: IconType; color: string; bg: string }
> = {
  checking: {
    label: 'Checking…',
    detail: 'Comparing the verified code hash with the code deployed on-chain.',
    color: 'muted',
    bg: 'subtle',
  },
  match: {
    label: 'Matches on-chain',
    detail: 'The deployed code hash equals the verified code hash.',
    icon: FiCheckCircle,
    color: 'status.ok',
    bg: 'status.okBg',
  },
  mismatch: {
    label: 'Hash mismatch',
    detail: 'The deployed code differs from the verified build.',
    icon: FiXCircle,
    color: 'status.bad',
    bg: 'status.badBg',
  },
  no_code: {
    label: 'Not deployed',
    detail: 'No contract code is currently deployed on this account.',
    icon: FiMinusCircle,
    color: 'status.bad',
    bg: 'status.badBg',
  },
  unavailable: {
    label: 'Status unknown',
    detail: 'The on-chain code could not be fetched. This is not a mismatch.',
    icon: FiAlertTriangle,
    color: 'status.warn',
    bg: 'status.warnBg',
  },
}

export const hashStatusText = (status: Status) => STATUS[status]

/** Compact status pill: icon + text, tinted per state (never colour alone). */
export default function HashStatus(props: { check: HashCheck; size?: 'sm' | 'md' }) {
  const meta = STATUS[props.check.status]
  const md = props.size === 'md'
  return (
    <Tooltip label={meta.detail} placement="top" openDelay={400}>
      <HStack
        as="span"
        display="inline-flex"
        spacing={1.5}
        px={md ? 2.5 : 2}
        py={md ? 1 : 0.5}
        rounded="full"
        bg={meta.bg}
        color={meta.color}
        fontSize={md ? 'sm' : 'xs'}
        fontWeight="600"
        lineHeight="1.4"
        whiteSpace="nowrap"
      >
        {meta.icon ? (
          <Icon as={meta.icon} aria-hidden boxSize="1.1em" />
        ) : (
          <Spinner size="xs" aria-hidden />
        )}
        <Text as="span">{meta.label}</Text>
      </HStack>
    </Tooltip>
  )
}

/** Row status that only queries the chain while the row is on (or near) screen. */
export function RowHashStatus(props: {
  network: NetworkType
  accountId: string
  codeHash: string
}) {
  const { check, ref } = useCodeHashCheck(props.network, props.accountId, props.codeHash, {
    whenVisible: true,
  })
  return (
    <Box as="span" ref={ref} display="inline-block">
      <HashStatus check={check} />
    </Box>
  )
}
