import CopyButton from '@/components/Common/CopyButton'
import ExternalTextLink from '@/components/Common/ExternalTextLink'
import { Field, Fields, Panel } from '@/components/Common/Panel'
import type { MetadataLoad } from '@/hooks/useContract'
import { parseImageRef, registryPage } from '@/utils/buildImage'
import { Badge, Box, Code, Flex, HStack, Spinner, Stack, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

const Mono = (props: { children: ReactNode }) => (
  <Text as="span" fontFamily="mono" fontSize="13px" wordBreak="break-all">
    {props.children}
  </Text>
)
const NotSet = (props: { children: ReactNode }) => <Text as="span" color="muted">{props.children}</Text>

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

export default function BuildPane(props: { metadata: MetadataLoad }) {
  const { metadata } = props
  if (metadata.status !== 'ready')
    return (
      <Panel title="Build metadata (NEP-330)">
        <Text px={{ base: 4, md: 5 }} py={4} fontSize="sm" color={metadata.status === 'error' ? 'status.warn' : 'muted'} role="status">
          {metadata.status === 'loading' ? (
            <HStack as="span">
              <Spinner size="xs" />
              <span>Loading contract_source_metadata…</span>
            </HStack>
          ) : metadata.status === 'missing' ? (
            'This contract doesn’t expose contract_source_metadata, so no build metadata is published on-chain.'
          ) : (
            'Couldn’t load the contract metadata from the RPC.'
          )}
        </Text>
      </Panel>
    )
  const m = metadata.metadata
  const build = m.build_info
  const env = typeof build?.build_environment === 'string' ? build.build_environment.trim() : ''
  const standards = Array.isArray(m.standards) ? m.standards : []
  const command = Array.isArray(build?.build_command) ? build?.build_command ?? [] : []
  return (
    <Panel title="Build metadata (NEP-330)">
      <Fields>
        <Field label="Version">{m.version ? <Mono>{m.version}</Mono> : <NotSet>Not specified</NotSet>}</Field>
        <Field label="Standards">
          {standards.length ? (
            <Flex gap={1.5} wrap="wrap">
              {standards.map((s) => (
                <Badge key={`${s.standard}:${s.version}`} textTransform="none" bg="subtle" color="ink" fontWeight="500" fontFamily="mono">
                  {s.standard} {s.version}
                </Badge>
              ))}
            </Flex>
          ) : (
            <NotSet>None declared</NotSet>
          )}
        </Field>
        <Field label="Build command">
          {command.length ? (
            <Code display="block" whiteSpace="pre-wrap" wordBreak="break-all" bg="subtle" color="ink" px={2} py={1.5} fontSize="13px" rounded="md">
              {command.join(' ')}
            </Code>
          ) : (
            <NotSet>Not specified</NotSet>
          )}
        </Field>
        <Field label="Build environment">{env ? <BuildImage value={env} /> : <NotSet>Not specified</NotSet>}</Field>
        <Field label="Contract path">{build?.contract_path ? <Mono>{build.contract_path}</Mono> : <NotSet>/ (repository root)</NotSet>}</Field>
        <Field label="Source snapshot">{build?.source_code_snapshot ? <Mono>{build.source_code_snapshot}</Mono> : <NotSet>Not specified</NotSet>}</Field>
      </Fields>
    </Panel>
  )
}
