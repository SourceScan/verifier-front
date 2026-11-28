import CopyButton from '@/components/Common/CopyButton'
import ExternalTextLink from '@/components/Common/ExternalTextLink'
import GithubLink from '@/components/Common/GithubLink'
import { Field, Fields, Panel } from '@/components/Common/Panel'
import type { GithubDto } from '@/Interfaces/github/github.dto'
import { parseImageRef, registryPage } from '@/utils/buildImage'
import type { MetadataField, MetadataLoad } from '@/utils/contractMetadata'
import { liveRelation, LiveSource, RecordedSource } from '@/utils/evidence'
import { githubTreeUrl } from '@/utils/urls'
import { Badge, Box, Button, Code, Flex, HStack, Spinner, Stack, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

const Mono = (props: { children: ReactNode }) => (
  <Text as="span" fontFamily="mono" fontSize="13px" wordBreak="break-all">
    {props.children}
  </Text>
)
const NotSet = (props: { children: ReactNode }) => <Text as="span" color="muted">{props.children}</Text>
/** A field the contract published with the wrong type: flagged, never rendered. */
const Flagged = (props: { children: ReactNode }) => (
  <Text as="span" color="status.warn">
    {props.children}
  </Text>
)

/**
 * The exact image reference from the metadata (tag and digest included), with a
 * link only to the registry the reference actually names, when its page is known.
 */
function BuildImage(props: { value: string }) {
  const ref = parseImageRef(props.value)
  const page = ref ? registryPage(ref) : null
  return (
    <Stack spacing={1}>
      <HStack spacing={1} align="flex-start">
        <Mono>{props.value}</Mono>
        <Box mt="-3px">
          <CopyButton value={props.value} label="Copy image reference" />
        </Box>
      </HStack>
      <Text as="div" fontSize="13px" color="muted">
        {page ? (
          <ExternalTextLink href={page.url}>View this image on {page.name}</ExternalTextLink>
        ) : ref ? (
          <>Registry: <Mono>{ref.registry}</Mono> (not linked)</>
        ) : (
          'Not a recognised container image reference; shown exactly as published.'
        )}
      </Text>
      {ref && !ref.digest && (
        <Text fontSize="13px" color="status.warn">
          No image digest is pinned, so this tag may point to a different image today.
        </Text>
      )}
    </Stack>
  )
}

const TITLE = 'Current build metadata (NEP-330)'

/** The folder on GitHub, or null when the path can't be put into a URL. */
function githubFolderUrl(g: GithubDto, dir: string): string | null {
  try {
    return `${githubTreeUrl(g)}/${dir.split('/').map(encodeURIComponent).join('/')}`
  } catch {
    return null
  }
}

const ABSENT: Record<Extract<MetadataLoad, { status: 'absent' }>['reason'], string> = {
  no_method: 'The deployed contract doesn’t expose contract_source_metadata, so no build metadata is published on-chain.',
  no_code: 'No contract code is deployed on this account at the latest final block, so there is no build metadata.',
  no_account: 'This account doesn’t exist at the latest final block, so there is no build metadata.',
  null: 'The deployed contract’s contract_source_metadata returns null, so no build metadata is published.',
}

function Status(props: { tone?: 'muted' | 'warn'; children: ReactNode }) {
  return (
    <Panel title={TITLE}>
      <Box px={{ base: 4, md: 5 }} py={4} fontSize="sm" color={props.tone === 'warn' ? 'status.warn' : 'muted'} role="status">
        {props.children}
      </Box>
    </Panel>
  )
}

/** The contract's NEP-330 metadata as read now, labelled as describing the code deployed now. */
export default function BuildPane(props: { metadata: MetadataLoad; onRetry: () => void; recorded: RecordedSource; live: LiveSource }) {
  const { metadata } = props
  if (metadata.status === 'loading')
    return (
      <Status>
        <HStack as="span">
          <Spinner size="xs" />
          <span>Loading contract_source_metadata…</span>
        </HStack>
      </Status>
    )
  if (metadata.status === 'unknown')
    return (
      <Status tone="warn">
        <Flex gap={3} align="center" justify="space-between" wrap="wrap">
          <Text>Couldn’t read contract_source_metadata: the RPC request failed or the call returned an error. The build metadata is unknown.</Text>
          <Button size="sm" variant="quiet" onClick={props.onRetry}>
            Try again
          </Button>
        </Flex>
      </Status>
    )
  if (metadata.status === 'absent') return <Status>{ABSENT[metadata.reason]}</Status>
  if (metadata.status === 'invalid')
    return <Status tone="warn">The deployed contract’s contract_source_metadata returns a value that isn’t a NEP-330 metadata object, so it isn’t shown.</Status>

  const m = metadata.metadata
  const build = m.buildInfo
  const bad = (field: MetadataField) => m.invalid.includes(field)
  const wrongType = <Flagged>Published with the wrong type; not shown</Flagged>
  const env = build?.buildEnvironment?.trim() ?? ''
  const relation = liveRelation(props.recorded, props.live)
  const liveGithub = props.live.status === 'ready' ? props.live.github : null
  const folderUrl = liveGithub && build?.contractDir ? githubFolderUrl(liveGithub, build.contractDir) : null

  return (
    <Panel title={TITLE}>
      <Text px={{ base: 4, md: 5 }} py={3} fontSize="sm" color="muted" borderBottom="1px solid" borderColor="rule">
        Read from the deployed contract at the latest final block. It describes the code deployed now, which can differ from the verified build.
      </Text>
      <Fields>
        <Field label="Version">{bad('version') ? wrongType : m.version ? <Mono>{m.version}</Mono> : <NotSet>Not specified</NotSet>}</Field>
        <Field label="Standards">
          <Stack spacing={1.5}>
            {m.standards.length ? (
              <Flex gap={1.5} wrap="wrap">
                {m.standards.map((s) => (
                  <Badge key={JSON.stringify([s.standard, s.version])} textTransform="none" bg="subtle" color="ink" fontWeight="500" fontFamily="mono">
                    {s.standard} {s.version}
                  </Badge>
                ))}
              </Flex>
            ) : (
              !bad('standards') && <NotSet>None declared</NotSet>
            )}
            {bad('standards') && <Flagged>Entries that aren’t a standard and version string were ignored.</Flagged>}
          </Stack>
        </Field>
        {bad('build_info') || !build ? (
          <Field label="Build info">{bad('build_info') ? wrongType : <NotSet>Not published</NotSet>}</Field>
        ) : (
          <>
            <Field label="Build command">
              {bad('build_command') ? (
                <Flagged>Not a list of strings; not shown</Flagged>
              ) : build.buildCommand?.length ? (
                <Code display="block" whiteSpace="pre-wrap" wordBreak="break-all" bg="subtle" color="ink" px={2} py={1.5} fontSize="13px" rounded="md">
                  {build.buildCommand.join(' ')}
                </Code>
              ) : (
                <NotSet>Not specified</NotSet>
              )}
            </Field>
            <Field label="Build environment">{bad('build_environment') ? wrongType : env ? <BuildImage value={env} /> : <NotSet>Not specified</NotSet>}</Field>
            <Field label="Contract path">
              {build.contractPath ? (
                <Stack spacing={1}>
                  <Mono>{build.contractPath}</Mono>
                  {bad('contract_path') && <Flagged>Not a relative folder inside the source, so it isn’t used to open the source.</Flagged>}
                  {folderUrl && (
                    <Text as="div" fontSize="13px">
                      <ExternalTextLink href={folderUrl} srSuffix="on GitHub, at the commit in the current metadata">
                        This folder on GitHub at the current metadata’s commit
                      </ExternalTextLink>
                    </Text>
                  )}
                </Stack>
              ) : bad('contract_path') ? (
                wrongType
              ) : (
                <NotSet>/ (repository root)</NotSet>
              )}
            </Field>
            <Field label="Source snapshot">
              {bad('source_code_snapshot') ? (
                wrongType
              ) : build.sourceCodeSnapshot ? (
                <Stack spacing={1}>
                  <Mono>{build.sourceCodeSnapshot}</Mono>
                  {liveGithub && <GithubLink github={liveGithub} />}
                  {relation === 'same' && (
                    <Text fontSize="13px" color="muted">
                      Same repository and commit as the verified snapshot.
                    </Text>
                  )}
                  {relation === 'different' && (
                    <Text fontSize="13px" color="status.warn">
                      Not the repository and commit of the verified snapshot; the Evidence tab shows the verified one.
                    </Text>
                  )}
                </Stack>
              ) : (
                <NotSet>Not specified</NotSet>
              )}
            </Field>
          </>
        )}
      </Fields>
    </Panel>
  )
}
