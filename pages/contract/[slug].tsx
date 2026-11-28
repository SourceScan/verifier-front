import CopyButton from '@/components/Common/CopyButton'
import NetworkPill from '@/components/Common/NetworkPill'
import PageHead from '@/components/Common/PageHead'
import StatePanel from '@/components/Common/StatePanel'
import Verdict, { VerdictPending } from '@/components/Contracts/Verdict'
import BuildPane from '@/components/Workspace/BuildPane'
import EvidencePane from '@/components/Workspace/EvidencePane'
import SourcePane from '@/components/Workspace/SourcePane'
import PaneBoundary from '@/components/Common/PaneBoundary'
import { NetworkType, useNetwork } from '@/contexts/NetworkContext'
import { useAccountNetwork } from '@/hooks/useAccountNetwork'
import { useCodeHashCheck } from '@/hooks/useCodeHashCheck'
import { useContractRecord, useSourceMetadata } from '@/hooks/useContract'
import { useRecordedSource } from '@/hooks/useRecordedSource'
import { langLabel } from '@/utils/contracts'
import { detectNetworkFromAddress } from '@/utils/detectNetwork'
import { chooseSourceRoot, FolderChoice, liveSource } from '@/utils/evidence'
import { githubFromSnapshot } from '@/utils/extractGithub'
import { hasClientNavigated, registryUrl } from '@/utils/navigation'
import { explorerContractUrl, workspaceHref } from '@/utils/urls'
import { Badge, Box, Button, Container, Flex, Heading, HStack, Icon, Link, VisuallyHidden } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiArrowLeft, FiArrowUpRight } from 'react-icons/fi'

type Tab = 'source' | 'evidence' | 'build'
const TABS: { id: Tab; label: string }[] = [
  { id: 'source', label: 'Verified source' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'build', label: 'Build' },
]
const PANE_LABEL: Record<Tab, string> = { source: 'the verified source', evidence: 'the evidence', build: 'the build metadata' }
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const asTab = (v?: string): Tab => (v === 'evidence' || v === 'build' ? v : 'source')

/** One contract workspace for /contract/{id} and the legacy /code/{id}. */
export default function WorkspacePage() {
  const router = useRouter()
  const slug = one(router.query.slug) ?? ''
  // A genuinely different account gets a fresh workspace (no state carries over).
  return <Workspace key={slug} accountId={slug} />
}

function Workspace({ accountId }: { accountId: string }) {
  const router = useRouter()
  const { network, networkConfig } = useNetwork()
  const networkParam = one(router.query.network)
  const tab = asTab(one(router.query.tab))
  const requestedFile = one(router.query.file) ?? null
  const netState = useAccountNetwork(accountId || undefined, networkParam)
  const { load, retry } = useContractRecord(accountId, netState === 'ready')
  const data = netState === 'ready' && load.status === 'ready' ? load.data : null
  const metadata = useSourceMetadata(accountId, !!data)
  // The recorded source is read only for the tabs that show it.
  const recorded = useRecordedSource(network, data, tab !== 'source')
  const { check, retry: retryHashCheck } = useCodeHashCheck(network, accountId, data?.code_hash)

  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    // Arriving at an account from inside the app: show and announce its heading.
    if (!hasClientNavigated()) return
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const [backHref, setBackHref] = useState('/')
  useEffect(() => setBackHref(registryUrl()), [])

  // The current metadata describes the code deployed now. It is never presented
  // as the recorded source: its folder opens the tree only under its own label.
  const live = useMemo(() => {
    const load = metadata.load
    const snapshot = load.status === 'ready' ? load.metadata.buildInfo?.sourceCodeSnapshot : null
    return liveSource(load, githubFromSnapshot(snapshot))
  }, [metadata.load])
  // The reader's choice between the current metadata's folder and the snapshot root, per snapshot.
  const [folderChoice, setFolderChoice] = useState<{ cid: string; choice: FolderChoice } | null>(null)
  const choice: FolderChoice = data && folderChoice?.cid === data.cid ? folderChoice.choice : 'metadata'
  const sourceRoot = chooseSourceRoot(live, requestedFile, choice)

  const linkNetwork = detectNetworkFromAddress(accountId) ? undefined : network
  const hrefFor = (opts: { tab?: Tab; file?: string | null }) => {
    // Stay on the legacy /code route when the user came in through it.
    const base = router.pathname === '/code/[slug]' ? '/code' : '/contract'
    return workspaceHref(accountId, { network: linkNetwork, tab: opts.tab ?? tab, file: opts.file ?? undefined }, base)
  }
  const replaceQuery = (opts: { tab?: Tab; file?: string | null }) =>
    void router.replace(hrefFor(opts), undefined, { shallow: true, scroll: false })

  // Keep the address truthful once the network is settled: implicit and
  // deterministic accounts always carry the network they are read from (so
  // Back/Forward and shared links reopen it), named accounts never carry one.
  useEffect(() => {
    if (netState !== 'ready' || !router.isReady) return
    if ((networkParam ?? '') === (linkNetwork ?? '') && !Array.isArray(router.query.network)) return
    replaceQuery({ file: requestedFile })
    // hrefFor/replaceQuery are derived from the values listed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netState, router.isReady, networkParam, linkNetwork])

  const pageTitle = `${accountId} on SourceScan`
  const nearblocks = explorerContractUrl(network, accountId)

  let body: React.ReactNode
  if (netState === 'unknown_network') {
    const shown = (networkParam ?? '').slice(0, 40)
    body = (
      <StatePanel
        tone="warning"
        title="This link names an unknown network"
        action={
          <HStack justify="center" spacing={2} flexWrap="wrap">
            <Button as={NextLink} href={workspaceHref(accountId, { network: 'mainnet', tab, file: requestedFile ?? undefined })} variant="quiet">
              Open on Mainnet
            </Button>
            <Button as={NextLink} href={workspaceHref(accountId, { network: 'testnet', tab, file: requestedFile ?? undefined })} variant="quiet">
              Open on Testnet
            </Button>
          </HStack>
        }
      >
        “{shown}” is not a NEAR network. This account ID can exist on Mainnet and on Testnet, so choose which record to open.
      </StatePanel>
    )
  } else if (netState === 'invalid') {
    body = (
      <StatePanel tone="warning" title="Invalid account ID" action={<Button as={NextLink} href="/" variant="quiet">Look up another account</Button>}>
        “{accountId}” is not a valid NEAR account ID.
      </StatePanel>
    )
  } else if (load.status === 'not_found' && netState === 'ready') {
    const other: NetworkType = network === 'mainnet' ? 'testnet' : 'mainnet'
    const ambiguous = !detectNetworkFromAddress(accountId)
    body = (
      <StatePanel
        tone="empty"
        title={`No verified record on ${networkConfig.name}`}
        action={
          <HStack justify="center" spacing={2} flexWrap="wrap">
            {ambiguous && (
              <Button as={NextLink} href={workspaceHref(accountId, { network: other })} variant="quiet">
                Check {other === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </Button>
            )}
            <Button as={NextLink} href="/" variant="quiet">
              Look up another account
            </Button>
          </HStack>
        }
      >
        SourceScan has not verified {accountId} on {networkConfig.name}.
      </StatePanel>
    )
  } else if (load.status === 'error' && netState === 'ready') {
    body = (
      <StatePanel tone="error" title="Couldn’t load the verification record" action={<Button variant="quiet" onClick={retry}>Try again</Button>}>
        The {networkConfig.name} RPC request failed or the registry returned an error.
      </StatePanel>
    )
  } else {
    body = (
      <>
        {data ? (
          <Verdict check={check} verifiedHash={data.code_hash} networkName={networkConfig.name} onRetry={retryHashCheck} />
        ) : (
          <VerdictPending label="Loading the verification record…" />
        )}

        <Flex as="nav" aria-label="Contract sections" mt={6} borderBottom="1px solid" borderColor="rule" gap={1} overflowX="auto">
          {TABS.map((t) => (
            <Link
              key={t.id}
              as={NextLink}
              href={hrefFor({ tab: t.id, file: requestedFile })}
              replace
              shallow
              scroll={false}
              aria-current={t.id === tab ? 'page' : undefined}
              px={3}
              py={2.5}
              mb="-1px"
              fontSize="sm"
              fontWeight={t.id === tab ? 650 : 500}
              color={t.id === tab ? 'ink' : 'muted'}
              borderBottom="2px solid"
              borderColor={t.id === tab ? 'accent' : 'transparent'}
              whiteSpace="nowrap"
              _hover={{ color: 'ink', textDecoration: 'none' }}
            >
              {t.label}
            </Link>
          ))}
        </Flex>

        <Box mt={4}>
          {!data ? (
            <Box border="1px solid" borderColor="rule" rounded="lg" bg="surface" h={{ base: '72vh', md: 'min(78vh, 880px)' }} minH="420px" aria-hidden />
          ) : (
            // One broken pane shows its own error instead of blanking the page.
            <PaneBoundary key={`${network}:${data.cid}:${tab}`} label={PANE_LABEL[tab]}>
              {tab === 'source' ? (
                <SourcePane
                  network={network}
                  data={data}
                  root={sourceRoot}
                  onChooseFolder={(next) => {
                    // A file picked in the other folder would no longer be listed.
                    setFolderChoice({ cid: data.cid, choice: next })
                    replaceQuery({ file: null })
                  }}
                  onRetryMetadata={metadata.retry}
                  requested={requestedFile}
                  hrefFor={(file) => hrefFor({ file })}
                  onSelect={(file) => replaceQuery({ file })}
                  check={check}
                />
              ) : tab === 'evidence' ? (
                <EvidencePane accountId={accountId} network={network} data={data} check={check} recorded={recorded.source} onRetryRecorded={recorded.retry} />
              ) : (
                <BuildPane metadata={metadata.load} onRetry={metadata.retry} recorded={recorded.source} live={live} />
              )}
            </PaneBoundary>
          )}
        </Box>
      </>
    )
  }

  return (
    <>
      <PageHead title={pageTitle} />
      <Container maxW="1280px" px={{ base: 4, md: 6 }} pt={{ base: 4, md: 6 }}>
        <Link as={NextLink} href={backHref} display="inline-flex" alignItems="center" gap={1.5} fontSize="sm" color="muted" _hover={{ color: 'ink' }}>
          <Icon as={FiArrowLeft} aria-hidden />
          Verified contracts
        </Link>

        <Flex mt={3} mb={4} gap={3} align={{ base: 'flex-start', md: 'flex-end' }} justify="space-between" direction={{ base: 'column', md: 'row' }}>
          <Box minW={0}>
            <HStack spacing={2} mb={1.5} minH="22px">
              {netState !== 'unknown_network' && <NetworkPill />}
              {data && (
                <Badge textTransform="none" px={2} py={0.5} rounded="full" bg="subtle" color="muted" fontWeight="600">
                  {langLabel(data.lang)}
                </Badge>
              )}
            </HStack>
            <HStack spacing={1} align="flex-start">
              <Heading ref={headingRef} tabIndex={-1} as="h1" fontFamily="mono" fontSize={{ base: 'xl', md: '26px' }} fontWeight="600" letterSpacing="0" wordBreak="break-all" lineHeight="1.25" _focusVisible={{ outline: 'none' }}>
                {accountId}
              </Heading>
              <Box pt={{ base: 0.5, md: 1 }}>
                <CopyButton value={accountId} label="Copy account ID" />
              </Box>
            </HStack>
          </Box>
          {netState !== 'invalid' && netState !== 'unknown_network' && (
            <Button as="a" href={nearblocks} target="_blank" rel="noopener noreferrer" size="sm" variant="quiet" rightIcon={<FiArrowUpRight aria-hidden />} flexShrink={0}>
              View contract on NearBlocks
              <VisuallyHidden> ({networkConfig.name}, opens in new tab)</VisuallyHidden>
            </Button>
          )}
        </Flex>

        {body}
      </Container>
    </>
  )
}
