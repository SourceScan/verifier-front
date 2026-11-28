import CopyButton from '@/components/Common/CopyButton'
import IconLink from '@/components/Common/IconLink'
import { verdictTone } from '@/components/Contracts/Verdict'
import type { NetworkType } from '@/contexts/NetworkContext'
import type { HashCheck } from '@/hooks/useCodeHashCheck'
import type { ContractData } from '@/utils/contracts'
import { FolderChoice, isSnapshotFilePath, SourceRoot } from '@/utils/evidence'
import { cachedSource, cachedSourcePaths, entryPath, fetchSource, listSourcePaths } from '@/utils/sourceFiles'
import { HEADER_H } from '@/utils/theme'
import { ipfsFileUrl } from '@/utils/urls'
import {
  Box,
  Button,
  Center,
  Code,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Select,
  Skeleton,
  Spinner,
  Stack,
  Text,
  useColorMode,
} from '@chakra-ui/react'
import { rust } from '@codemirror/lang-rust'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import NextLink from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronDown, FiChevronRight, FiFile, FiFilter } from 'react-icons/fi'

const PANE_H = { base: '72vh', md: 'min(78vh, 880px)' }

const STRIPE: Record<HashCheck['status'], string> = {
  checking: 'Checking the deployed code…',
  match: 'The deployed code matches this verified build.',
  mismatch: 'The deployed code differs from this verified build.',
  no_code: 'No contract code is currently deployed on this account.',
  unavailable: 'The deployed code could not be checked.',
}

type Files = { key: string; status: 'loading' | 'error' | 'ready'; paths: string[]; partial: boolean }
type Content = { key: string; status: 'loading' | 'error' | 'ready'; text: string }

/**
 * Says which folder the tree shows and where that came from. The registry
 * doesn't record which crate was built, so a folder taken from the current
 * metadata is always labelled as such, even when it names the recorded commit.
 */
function FolderNotice(props: { root: SourceRoot; onChooseFolder: (_choice: FolderChoice) => void; onRetryMetadata: () => void }) {
  const { root } = props
  const hint = root.hint
  if (hint.status === 'none') return null
  const warn = hint.status === 'unknown'
  const where = root.basis === 'link' ? <>Showing <Code fontSize="13px">{root.rootPath}/</Code>, the folder of the linked file.</> : <>Showing the snapshot root.</>
  return (
    <Flex
      role="status"
      mb={3}
      px={3}
      py={2}
      gap={2}
      align="center"
      justify="space-between"
      wrap="wrap"
      fontSize="sm"
      border="1px solid"
      rounded="lg"
      borderColor={warn ? 'status.warnBorder' : 'rule'}
      bg={warn ? 'status.warnBg' : 'surface'}
      color={warn ? 'status.warn' : 'muted'}
    >
      <Text flex="1" minW="240px">
        {hint.status === 'unknown' ? (
          <>Couldn’t read the contract’s current metadata, so it’s unknown which folder of this snapshot holds the contract. {where}</>
        ) : root.basis === 'current_metadata' ? (
          <>
            Showing <Code fontSize="13px">{hint.dir}/</Code>, the folder named in the contract’s current metadata. The verification record doesn’t name the crate
            that was built, so this may not be the verified crate.
          </>
        ) : (
          <>
            The contract’s current metadata names <Code fontSize="13px">{hint.dir}/</Code>. The verification record doesn’t name the crate that was built.
          </>
        )}
      </Text>
      {hint.status === 'unknown' ? (
        <Button size="sm" variant="quiet" onClick={props.onRetryMetadata}>
          Try again
        </Button>
      ) : root.basis === 'current_metadata' ? (
        <Button size="sm" variant="quiet" onClick={() => props.onChooseFolder('root')}>
          Show snapshot root
        </Button>
      ) : (
        <Button size="sm" variant="quiet" onClick={() => props.onChooseFolder('metadata')} fontFamily="mono" maxW="full" h="auto" minH={8} py={1} whiteSpace="normal" wordBreak="break-all">
          Open {hint.dir}/
        </Button>
      )}
    </Flex>
  )
}

export default function SourcePane(props: {
  network: NetworkType
  data: ContractData
  root: SourceRoot
  onChooseFolder: (_choice: FolderChoice) => void
  onRetryMetadata: () => void
  /** `?file=` from the URL. */
  requested: string | null
  hrefFor: (_file: string) => string
  onSelect: (_file: string) => void
  check: HashCheck
}) {
  const { root, onChooseFolder, onRetryMetadata, ...tree } = props
  return (
    <>
      <FolderNotice root={root} onChooseFolder={onChooseFolder} onRetryMetadata={onRetryMetadata} />
      <SourceTree {...tree} rootPath={root.rootPath} />
    </>
  )
}

function SourceTree(props: {
  network: NetworkType
  data: ContractData
  /** Snapshot folder to list ('/' = root); null while it is still being decided. */
  rootPath: string | null
  /** `?file=` from the URL. */
  requested: string | null
  hrefFor: (_file: string) => string
  onSelect: (_file: string) => void
  check: HashCheck
}) {
  const { network, data, rootPath } = props
  const { colorMode } = useColorMode()
  const paneRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [filesAttempt, setFilesAttempt] = useState(0)
  const [contentAttempt, setContentAttempt] = useState(0)

  const filesKey = `${network}:${data.cid}:${rootPath}`
  const [files, setFiles] = useState<Files>(() => {
    const hit = rootPath !== null ? cachedSourcePaths(network, data.cid, rootPath) : undefined
    return { key: filesKey, status: hit ? 'ready' : 'loading', paths: hit ?? [], partial: false }
  })

  useEffect(() => {
    if (rootPath === null) return
    const hit = cachedSourcePaths(network, data.cid, rootPath)
    if (hit) return setFiles({ key: filesKey, status: 'ready', paths: hit, partial: false })
    let active = true
    setFiles({ key: filesKey, status: 'loading', paths: [], partial: false })
    listSourcePaths(network, data.cid, rootPath)
      .then(({ paths, partial }) => active && setFiles({ key: filesKey, status: 'ready', paths, partial }))
      .catch(() => active && setFiles({ key: filesKey, status: 'error', paths: [], partial: false }))
    return () => {
      active = false
    }
  }, [network, data.cid, rootPath, filesKey, filesAttempt])

  const ready = files.key === filesKey && files.status === 'ready'
  const paths = useMemo(() => (ready ? files.paths : []), [ready, files.paths])
  const partial = ready && files.partial
  // A linked file opens even when the listing doesn't show it (it can sit
  // deeper than one folder below the root). Only when reading it fails does
  // the tree fall back to its entry file, without claiming the file is absent.
  const requested = props.requested && isSnapshotFilePath(props.requested) ? props.requested : null
  const listed = !!requested && paths.includes(requested)
  const linkKey = requested ? `${data.cid}:${requested}` : null
  const [linkFailed, setLinkFailed] = useState<string | null>(null)
  const openLink = !!requested && (listed || linkFailed !== linkKey)
  const active = ready ? (openLink ? requested : entryPath(paths, data.lang)) : props.requested
  const unlistedLink = ready && openLink && !listed
  const linkFallback = ready && !!props.requested && !openLink
  const retryLink = () => {
    setLinkFailed(null)
    setContentAttempt((n) => n + 1)
  }

  const contentKey = `${data.cid}:${active}`
  const [content, setContent] = useState<Content>(() => {
    const hit = active ? cachedSource(data.cid, active) : undefined
    return { key: contentKey, status: hit !== undefined ? 'ready' : 'loading', text: hit ?? '' }
  })

  useEffect(() => {
    if (!ready || !active) return
    const hit = cachedSource(data.cid, active)
    if (hit !== undefined) return setContent({ key: contentKey, status: 'ready', text: hit })
    let active_ = true
    setContent({ key: contentKey, status: 'loading', text: '' })
    fetchSource(network, data.cid, active)
      .then((text) => active_ && setContent({ key: contentKey, status: 'ready', text }))
      .catch(() => {
        if (!active_) return
        if (active === requested && !listed) setLinkFailed(linkKey)
        else setContent({ key: contentKey, status: 'error', text: '' })
      })
    return () => {
      active_ = false
    }
  }, [ready, active, network, data.cid, contentKey, contentAttempt, requested, listed, linkKey])

  // Only ever show the content that belongs to the file named in the header.
  const shown: Content = content.key === contentKey ? content : { key: contentKey, status: 'loading', text: '' }

  /** After a file change, keep the editor in view without jumping to the page top. */
  const keepEditorInView = () => {
    requestAnimationFrame(() => {
      const top = paneRef.current?.getBoundingClientRect().top
      if (top !== undefined && top < HEADER_H) window.scrollTo({ top: window.scrollY + top - HEADER_H - 8 })
    })
  }
  const choose = (file: string) => {
    if (file === active) return
    props.onSelect(file)
    keepEditorInView()
  }

  const groups = useMemo(() => {
    const out: { dir: string; files: string[] }[] = []
    for (const p of paths) {
      const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : ''
      const group = out.find((g) => g.dir === dir) ?? out[out.push({ dir, files: [] }) - 1]
      group.files.push(p)
    }
    return out
  }, [paths])
  const needle = filter.trim().toLowerCase()
  const matches = needle ? paths.filter((p) => p.toLowerCase().includes(needle)) : null

  const tone = verdictTone(props.check.status)
  const fileLink = (p: string, label: string, depth: number) => (
    <Box as="li" key={p}>
      <Link
        as={NextLink}
        href={props.hrefFor(p)}
        replace
        shallow
        scroll={false}
        onClick={(e: React.MouseEvent) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
          e.preventDefault()
          choose(p)
        }}
        aria-current={p === active ? 'page' : undefined}
        display="flex"
        alignItems="center"
        gap={1.5}
        pl={`${12 + depth * 14}px`}
        pr={3}
        py={1}
        fontFamily="mono"
        fontSize="13px"
        color={p === active ? 'accent' : 'ink'}
        bg={p === active ? 'accentSubtle' : undefined}
        fontWeight={p === active ? 600 : 400}
        _hover={{ bg: p === active ? 'accentSubtle' : 'subtle', textDecoration: 'none' }}
        title={p}
      >
        <Icon as={FiFile} aria-hidden boxSize="12px" color="faint" flexShrink={0} />
        <Text as="span" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          {label}
        </Text>
      </Link>
    </Box>
  )

  if (files.key === filesKey && files.status === 'error')
    return (
      <Center minH="240px" border="1px solid" borderColor="rule" rounded="lg" bg="surface" p={6}>
        <Stack spacing={3} align="center" textAlign="center" role="alert">
          <Text fontWeight="600">Couldn’t open the IPFS snapshot</Text>
          <Text fontSize="sm" color="muted">The verified source for this record could not be read from IPFS right now.</Text>
          <Button size="sm" variant="quiet" onClick={() => setFilesAttempt((n) => n + 1)}>
            Try again
          </Button>
        </Stack>
      </Center>
    )

  if (ready && paths.length === 0 && !openLink)
    return (
      <Center minH="240px" border="1px solid" borderColor="rule" rounded="lg" bg="surface" p={6} role="status">
        <Stack spacing={3} align="center" textAlign="center">
          {linkFallback && <Text color="status.warn">Couldn’t open {props.requested} from this snapshot.</Text>}
          <Text color="muted">
            No .rs or .toml files at {rootPath === '/' ? 'the snapshot root' : `${rootPath}/`} or one folder below it
            {partial ? ', but some of those folders couldn’t be read.' : '.'}
          </Text>
          {(partial || (linkFallback && requested)) && (
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setFilesAttempt((n) => n + 1)
                retryLink()
              }}
            >
              Try again
            </Button>
          )}
        </Stack>
      </Center>
    )

  return (
    <Flex ref={paneRef} border="1px solid" borderColor="rule" rounded="lg" bg="surface" overflow="hidden" h={PANE_H} minH="420px" direction={{ base: 'column', md: 'row' }}>
      {/* Desktop: filterable tree */}
      <Flex as="nav" aria-label="Source files" direction="column" w="260px" flexShrink={0} borderRight="1px solid" borderColor="rule" bg="sunken" display={{ base: 'none', md: 'flex' }}>
        <Box p={2} borderBottom="1px solid" borderColor="rule">
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiFilter} color="faint" aria-hidden />
            </InputLeftElement>
            <Input aria-label="Filter files" placeholder="Filter files" value={filter} onChange={(e) => setFilter(e.target.value)} bg="surface" borderColor="rule" rounded="md" fontFamily="mono" fontSize="13px" />
          </InputGroup>
        </Box>
        <Box flex="1" overflowY="auto" py={1}>
          {!ready ? (
            <Stack spacing={2.5} p={3} aria-hidden>
              {[60, 45, 70, 50].map((w) => (
                <Skeleton key={w} h="10px" w={`${w}%`} />
              ))}
            </Stack>
          ) : matches ? (
            <Box as="ul" listStyleType="none">
              {matches.length ? matches.map((p) => fileLink(p, p, 0)) : <Text px={3} py={2} fontSize="sm" color="muted">No file matches “{filter}”</Text>}
            </Box>
          ) : (
            <Box as="ul" listStyleType="none">
              {groups.map((g) =>
                g.dir === '' ? (
                  g.files.map((p) => fileLink(p, p, 0))
                ) : (
                  <Box as="li" key={g.dir}>
                    <Button
                      variant="unstyled"
                      onClick={() => setCollapsed((c) => ({ ...c, [g.dir]: !c[g.dir] }))}
                      aria-expanded={!collapsed[g.dir]}
                      display="flex"
                      justifyContent="flex-start"
                      alignItems="center"
                      gap={1}
                      w="full"
                      h="auto"
                      px={2}
                      py={1}
                      fontFamily="mono"
                      fontSize="13px"
                      fontWeight="600"
                      color="muted"
                      rounded="none"
                      _hover={{ bg: 'subtle' }}
                    >
                      <Icon as={collapsed[g.dir] ? FiChevronRight : FiChevronDown} aria-hidden />
                      {g.dir}/
                    </Button>
                    {!collapsed[g.dir] && (
                      <Box as="ul" listStyleType="none">
                        {g.files.map((p) => fileLink(p, p.slice(g.dir.length + 1), 1))}
                      </Box>
                    )}
                  </Box>
                )
              )}
            </Box>
          )}
        </Box>
        {partial && (
          <Flex px={3} py={1.5} gap={2} align="center" justify="space-between" fontSize="xs" color="status.warn" bg="status.warnBg" borderTop="1px solid" borderColor="status.warnBorder" role="status">
            <Text>Some folders couldn’t be read.</Text>
            <Button size="xs" variant="quiet" onClick={() => setFilesAttempt((n) => n + 1)}>
              Try again
            </Button>
          </Flex>
        )}
        <Text fontSize="xs" color="faint" px={3} py={2} borderTop="1px solid" borderColor="rule">
          {ready ? `Rust and TOML files: ${paths.length}` : 'Reading snapshot…'}
        </Text>
      </Flex>

      {/* Editor column */}
      <Flex direction="column" flex="1" minW={0} minH={0}>
        <Flex px={3} py={1.5} minH="44px" align="center" gap={2} borderBottom="1px solid" borderColor="rule" wrap="wrap">
          {/* Mobile: native picker */}
          <Box display={{ base: 'block', md: 'none' }} flex="1" minW="0">
            <Select size="sm" aria-label="Source file" value={active ?? ''} onChange={(e) => choose(e.target.value)} isDisabled={!ready} fontFamily="mono" fontSize="13px" rounded="md" borderColor="ruleStrong" bg="surface">
              {!ready && <option value={active ?? ''}>{active ?? 'Reading snapshot…'}</option>}
              {unlistedLink && active && <option value={active}>{active}</option>}
              {groups.map((g) =>
                g.dir === '' ? (
                  g.files.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))
                ) : (
                  <optgroup key={g.dir} label={`${g.dir}/`}>
                    {g.files.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </Select>
          </Box>
          <Text display={{ base: 'none', md: 'block' }} fontFamily="mono" fontSize="13px" fontWeight="600" flex="1" minW={0} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={active ?? undefined}>
            {active ?? 'Reading snapshot…'}
          </Text>
          {shown.status === 'loading' && active && <Spinner size="xs" color="muted" aria-label={`Opening ${active}`} />}
          {active && (
            <>
              <CopyButton value={typeof window === 'undefined' ? '' : window.location.href} label="Copy link to this file" />
              <IconLink href={ipfsFileUrl(data.cid, active)} label={`Raw ${active} on IPFS`} />
            </>
          )}
        </Flex>
        <Text px={3} py={1.5} fontSize="xs" fontWeight="600" color={tone.fg} bg={tone.bg} borderBottom="1px solid" borderColor={tone.border}>
          {STRIPE[props.check.status]}
        </Text>
        {unlistedLink && (
          <Text px={3} py={1.5} fontSize="xs" color="muted" borderBottom="1px solid" borderColor="rule" role="status">
            Opened from the link; {requested} isn’t among the files listed from {rootPath === '/' ? 'the snapshot root' : `${rootPath}/`}.
          </Text>
        )}
        {linkFallback && (
          <Flex px={3} py={1.5} gap={2} align="center" justify="space-between" fontSize="xs" color="status.warn" bg="status.warnBg" borderBottom="1px solid" borderColor="status.warnBorder" role="status">
            <Text>
              Couldn’t open {props.requested} from this snapshot; showing {active}.
            </Text>
            {requested && (
              <Button size="xs" variant="quiet" onClick={retryLink}>
                Try again
              </Button>
            )}
          </Flex>
        )}
        <Box flex="1" minH={0} position="relative" sx={{ '& .cm-theme, & .cm-editor': { height: '100%' } }}>
          {shown.status === 'ready' && active ? (
            <CodeMirror
              key={contentKey}
              value={shown.text}
              editable={false}
              readOnly
              theme={colorMode}
              height="100%"
              basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
              extensions={[EditorView.contentAttributes.of({ 'aria-label': `Contents of ${active}` }), ...(active.endsWith('.rs') ? [rust()] : [])]}
              style={{ fontSize: '13px', height: '100%' }}
            />
          ) : shown.status === 'error' ? (
            <Center h="full" p={6} role="alert">
              <Stack spacing={3} align="center" textAlign="center">
                <Text fontWeight="600">Couldn’t load {active}</Text>
                <Button size="sm" variant="quiet" onClick={() => setContentAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </Stack>
            </Center>
          ) : (
            <Center h="full" color="muted" role="status" gap={2}>
              <Spinner size="sm" aria-hidden />
              <Text fontSize="sm">{active ? `Opening ${active}…` : 'Reading snapshot…'}</Text>
            </Center>
          )}
        </Box>
      </Flex>
    </Flex>
  )
}
