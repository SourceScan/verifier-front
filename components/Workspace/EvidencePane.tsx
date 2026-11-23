import CidLink from '@/components/Common/CidLink'
import CopyButton from '@/components/Common/CopyButton'
import ExternalTextLink from '@/components/Common/ExternalTextLink'
import GithubLink from '@/components/Common/GithubLink'
import { Field, Fields, Panel } from '@/components/Common/Panel'
import { hashStatusText } from '@/components/Contracts/HashStatus'
import { NETWORKS, NetworkType } from '@/contexts/NetworkContext'
import type { HashCheck } from '@/hooks/useCodeHashCheck'
import type { GithubDto } from '@/Interfaces/github/github.dto'
import type { ContractData } from '@/utils/contracts'
import { explorerContractUrl } from '@/utils/urls'
import { HStack, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

const Mono = (props: { children: ReactNode }) => (
  <Text as="span" fontFamily="mono" fontSize="13px" wordBreak="break-all">
    {props.children}
  </Text>
)

export default function EvidencePane(props: {
  accountId: string
  network: NetworkType
  data: ContractData
  check: HashCheck
  github: GithubDto | null
  entryFileUrl: string | null
  entryFile: string
}) {
  const { accountId, network, data, check } = props
  return (
    <Panel title="How this verdict was reached">
      <Fields>
        <Field label="Verdict">{hashStatusText(check.status).detail}</Field>
        <Field label="Method">
          The deployed code hash comes from a <Mono>view_code</Mono> query at the latest final block on {NETWORKS[network].name}; it is compared with the code hash recorded in the SourceScan registry.
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
        <Field label="Recorded at block">
          <Mono>{data.block_height}</Mono>
        </Field>
        <Field label="Source snapshot">
          <HStack spacing={1} align="flex-start">
            <CidLink cid={data.cid} />
            <CopyButton value={data.cid} label="Copy IPFS CID" />
          </HStack>
        </Field>
        <Field label="Repository">{props.github ? <GithubLink github={props.github} /> : <Text as="span" color="muted">Not published</Text>}</Field>
        {props.github && props.entryFileUrl && (
          <Field label="Entry file on GitHub">
            <ExternalTextLink href={props.entryFileUrl} fontFamily="mono" fontSize="13px" srSuffix="on GitHub">
              {props.entryFile || 'Repository root'}
            </ExternalTextLink>
          </Field>
        )}
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
