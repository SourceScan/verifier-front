import CidLink from '@/components/Common/CidLink'
import CopyButton from '@/components/Common/CopyButton'
import ExternalTextLink from '@/components/Common/ExternalTextLink'
import GithubLink from '@/components/Common/GithubLink'
import { Field, Fields, Panel } from '@/components/Common/Panel'
import { verdictSummary } from '@/components/Contracts/Verdict'
import { NETWORKS, NetworkType } from '@/contexts/NetworkContext'
import type { HashCheck } from '@/hooks/useCodeHashCheck'
import { ContractData, recordedBlock } from '@/utils/contracts'
import type { RecordedSource } from '@/utils/evidence'
import { explorerContractUrl } from '@/utils/urls'
import { Button, HStack, Spinner, Stack, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

const Mono = (props: { children: ReactNode }) => (
  <Text as="span" fontFamily="mono" fontSize="13px" wordBreak="break-all">
    {props.children}
  </Text>
)

const Muted = (props: { children: ReactNode }) => (
  <Text as="span" color="muted">
    {props.children}
  </Text>
)

/** Only the repository the record itself proves: the record's own, or the git checkout inside its snapshot. */
function RecordedRepository(props: { recorded: RecordedSource; onRetry: () => void }) {
  const { recorded } = props
  if (recorded.status === 'loading')
    return (
      <HStack as="span" spacing={2} color="muted">
        <Spinner size="xs" aria-hidden />
        <span>Reading the snapshot…</span>
      </HStack>
    )
  if (recorded.status === 'known')
    return (
      <Stack spacing={1}>
        <GithubLink github={recorded.github} />
        {recorded.origin === 'snapshot' && (
          <Text fontSize="13px" color="muted">
            From the git checkout stored in the verified snapshot.
          </Text>
        )}
      </Stack>
    )
  if (recorded.status === 'unknown')
    return (
      <HStack spacing={2} flexWrap="wrap">
        <Text as="span" color="status.warn">
          Unknown: the snapshot couldn’t be read.
        </Text>
        <Button size="sm" variant="quiet" onClick={props.onRetry}>
          Try again
        </Button>
      </HStack>
    )
  return (
    <Muted>
      Not recorded. The registry stores the snapshot above, not a repository, and{' '}
      {recorded.reason === 'no_checkout'
        ? 'the snapshot has no git checkout.'
        : 'the git checkout in the snapshot doesn’t name exactly one GitHub repository and commit.'}{' '}
      The Build tab shows the repository named in the contract’s current metadata, which may describe a later deployment.
    </Muted>
  )
}

export default function EvidencePane(props: {
  accountId: string
  network: NetworkType
  data: ContractData
  check: HashCheck
  recorded: RecordedSource
  onRetryRecorded: () => void
}) {
  const { accountId, network, data, check } = props
  return (
    <Panel title="How this verdict was reached">
      <Fields>
        <Field label="Verdict">{verdictSummary(check.status, NETWORKS[network].name)}</Field>
        <Field label="Method">
          SourceScan queries <Mono>view_code</Mono> at the latest final block on {NETWORKS[network].name} and compares the returned hash with the code hash recorded in the registry.
        </Field>
        <Field label="Verified code hash">
          <HStack spacing={1} align="flex-start">
            <Mono>{data.code_hash}</Mono>
            <CopyButton value={data.code_hash} label="Copy verified code hash" />
          </HStack>
        </Field>
        <Field label="Deployed code hash">
          {check.onChainHash ? (
            <HStack spacing={1} align="flex-start">
              <Mono>{check.onChainHash}</Mono>
              <CopyButton value={check.onChainHash} label="Copy deployed code hash" />
            </HStack>
          ) : (
            <Text as="span" color="muted">
              {check.status === 'no_code' ? 'None — no code deployed' : check.status === 'unavailable' ? 'Not available' : 'Checking…'}
            </Text>
          )}
        </Field>
        <Field label="Verification recorded at block">
          <Mono>{recordedBlock(data.block_height) ?? 'Unavailable'}</Mono>
        </Field>
        {check.blockHeight !== undefined && (
          <Field label="Deployed code checked at final block">
            <Mono>#{check.blockHeight}</Mono>
          </Field>
        )}
        <Field label="Source snapshot">
          <HStack spacing={1} align="flex-start">
            <CidLink cid={data.cid} />
            <CopyButton value={data.cid} label="Copy IPFS CID" />
          </HStack>
        </Field>
        <Field label="Repository">
          <RecordedRepository recorded={props.recorded} onRetry={props.onRetryRecorded} />
        </Field>
        <Field label="Registry contract">
          <Mono>{NETWORKS[network].contract}</Mono>
        </Field>
        <Field label="Explorer">
          <ExternalTextLink href={explorerContractUrl(network, accountId)}>Contract code on NearBlocks ({NETWORKS[network].name})</ExternalTextLink>
        </Field>
      </Fields>
    </Panel>
  )
}
