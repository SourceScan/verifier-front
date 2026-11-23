import Pagination from '@/components/Common/Pagination'
import PageHead from '@/components/Common/PageHead'
import StatePanel from '@/components/Common/StatePanel'
import { RowHashStatus } from '@/components/Contracts/HashStatus'
import RegistryList, { RegistryListSkeleton } from '@/components/Registry/RegistryList'
import RegistryTotal from '@/components/Registry/RegistryTotal'
import { useNetwork } from '@/contexts/NetworkContext'
import { RegistryParams, lookupExact, useExactLookup, useRegistryCount, useRegistryPage } from '@/hooks/useRegistry'
import { historyEntry, readScroll, rememberRegistryUrl, saveScroll } from '@/utils/navigation'
import { contractSearchKey, queryKind } from '@/utils/registrySearch'
import { explorerContractUrl, workspaceHref } from '@/utils/urls'
import {
  Box,
  Button,
  Container,
  Flex,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Select,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { NextPageContext } from 'next'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import type { ParsedUrlQuery } from 'querystring'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { FiArrowRight, FiArrowUpRight, FiSearch } from 'react-icons/fi'

/** All previously shared page sizes stay valid (old links used 5 by default). */
const LIMITS = [5, 10, 20, 50, 100]
const DEFAULT_LIMIT = 20

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Reads the existing `?search=&from_index=&limit=` URL scheme. */
function parseParams(query: ParsedUrlQuery): RegistryParams {
  const limit = Number(first(query.limit))
  const fromIndex = Number(first(query.from_index))
  return {
    search: (first(query.search) ?? '').trim(),
    limit: LIMITS.includes(limit) ? limit : DEFAULT_LIMIT,
    fromIndex: Number.isInteger(fromIndex) && fromIndex > 0 ? fromIndex : 0,
  }
}
const sameParams = (a: RegistryParams, b: RegistryParams) =>
  a.search === b.search && a.fromIndex === b.fromIndex && a.limit === b.limit

Home.getInitialProps = async (ctx: NextPageContext) => ({ query: ctx.query })

export default function Home(props: { query: ParsedUrlQuery }) {
  const router = useRouter()
  const { network, networkConfig } = useNetwork()
  const [params, setParams] = useState<RegistryParams>(() => parseParams(props.query))
  const [draft, setDraft] = useState(params.search)
  const [looking, setLooking] = useState<string | null>(null)
  const lookupToken = useRef(0)
  const lookupAbort = useRef<AbortController | null>(null)
  const registry = useRegistryPage(params)
  const total = useRegistryCount()
  const exact = useExactLookup(params.search)
  const restoredFor = useRef<string | null>(null)

  // Follow the URL: Back/Forward between queries and pages, network switch resets to "/".
  useEffect(() => {
    const next = parseParams(router.query)
    setParams((prev) => (sameParams(prev, next) ? prev : next))
  }, [router.query])
  useEffect(() => setDraft(params.search), [params.search])

  // Remember where the reader was for this history entry, and which registry view to return to.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(saveScroll)
    }
    // Scroll is saved continuously (above), never on routeChangeStart: on Back/Forward the
    // browser has already switched entries, so a save here would overwrite the wrong one.
    const onLeave = () => rememberRegistryUrl(router.asPath)
    window.addEventListener('scroll', onScroll, { passive: true })
    router.events.on('routeChangeStart', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      router.events.off('routeChangeStart', onLeave)
    }
  }, [router])

  // A new page keeps the reader's position. Only a revisited history entry has a saved offset.
  const settled = registry.current && !registry.pending
  useEffect(() => {
    if (!settled) return
    const entry = historyEntry()
    if (restoredFor.current === entry) return
    restoredFor.current = entry
    const y = readScroll()
    if (y !== null) window.scrollTo(0, y)
  }, [settled, router.asPath])

  // A pending exact lookup belongs to the network and page it started on. Switching
  // networks, any navigation (selector, Back, a row, paging) or leaving the page
  // drops it, so an old answer can never navigate or switch the network later.
  const cancelLookup = () => {
    lookupToken.current += 1
    lookupAbort.current?.abort()
    lookupAbort.current = null
    setLooking(null)
  }
  useEffect(() => {
    cancelLookup()
    // runs for every network change, including one made on another page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network])
  useEffect(() => {
    const onRouteChange = () => {
      if (lookupAbort.current) cancelLookup()
    }
    router.events.on('routeChangeStart', onRouteChange)
    return () => {
      router.events.off('routeChangeStart', onRouteChange)
      lookupToken.current += 1
      lookupAbort.current?.abort()
    }
  }, [router.events])

  const navigate = (next: RegistryParams) => {
    setParams(next)
    // The new entry keeps the reader's position; record it at once so Back to this
    // entry restores it even if the reader leaves without scrolling.
    void router
      .push({ pathname: '/', query: { search: next.search, from_index: next.fromIndex, limit: next.limit } }, undefined, { shallow: true, scroll: false })
      .then((done) => done && saveScroll())
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const q = draft.trim()
    if (lookupAbort.current) cancelLookup()
    const token = ++lookupToken.current
    if (!q) return navigate({ ...params, search: '', fromIndex: 0 })
    const kind = queryKind(q)
    if (kind === 'named' || kind === 'implicit' || kind === 'deterministic') {
      const controller = new AbortController()
      lookupAbort.current = controller
      setLooking(q)
      const result = await lookupExact(q, network, controller.signal)
      // Superseded by a newer lookup, a network switch, a navigation or unmount.
      if (token !== lookupToken.current || controller.signal.aborted) return
      lookupAbort.current = null
      setLooking(null)
      if (result.status === 'found') {
        void router.push(workspaceHref(result.accountId, { network: result.network }))
        return
      }
    }
    navigate({ ...params, search: q, fromIndex: 0 })
  }

  const shown = registry.shown
  const shownPage = shown ? Math.floor(shown.params.fromIndex / shown.params.limit) + 1 : 1
  const shownPages = shown ? Math.max(shown.pages, shownPage) : 0
  const searching = !!(shown ? shown.params.search : params.search)
  const label = shown?.params.search ? `Contracts matching “${shown.params.search}” on ${networkConfig.name}` : `Verified contracts on ${networkConfig.name}`
  const requestedPage = Math.floor(params.fromIndex / params.limit) + 1

  let status = ''
  if (looking) status = `Looking up ${looking}…`
  else if (registry.pending) status = shown ? (params.search !== shown.params.search ? `Searching for “${params.search}”…` : `Loading page ${requestedPage}…`) : 'Loading the registry…'
  else if (shown && shown.contracts.length) status = `${shown.params.fromIndex + 1}–${shown.params.fromIndex + shown.contracts.length}, page ${shownPage} of ${shownPages}`

  let list: React.ReactNode
  if (registry.failed) {
    list = (
      <StatePanel tone="error" title={`Couldn’t load ${params.search ? 'search results' : `page ${requestedPage}`}`} action={<Button variant="quiet" onClick={registry.retry}>Try again</Button>}>
        The {networkConfig.name} RPC request failed.
      </StatePanel>
    )
  } else if (!shown) {
    list = <RegistryListSkeleton rows={params.limit} />
  } else if (shown.contracts.length === 0) {
    list = shown.params.search ? (
      <StatePanel tone="search" title={`No verified contract names contain “${shown.params.search}”`}>
        Search compares names without their .near or .testnet suffix, on {networkConfig.name} only.
      </StatePanel>
    ) : shown.params.fromIndex > 0 ? (
      <StatePanel tone="empty" title="This page is empty" action={<Button variant="quiet" onClick={() => navigate({ ...shown.params, fromIndex: 0 })}>Go to the first page</Button>}>
        The registry has fewer contracts than this page offset.
      </StatePanel>
    ) : (
      <StatePanel tone="empty" title={`No verified contracts on ${networkConfig.name} yet`} />
    )
  } else {
    list = <RegistryList page={shown} busy={registry.pending} label={label} />
  }

  return (
    <>
      <PageHead title="Verified contracts on SourceScan" />
      <Container maxW="880px" px={{ base: 4, md: 6 }} pt={{ base: 8, md: 14 }}>
        <Heading as="h1" fontSize={{ base: '26px', md: '32px' }} fontWeight="700" letterSpacing="0" lineHeight="1.15">
          Check a NEAR contract’s source
        </Heading>
        <RegistryTotal count={total.count} networkName={networkConfig.name} onRetry={total.retry} />

        <Flex as="form" role="search" aria-label="Look up a contract" onSubmit={submit} mt={6} gap={2}>
          <InputGroup size="lg">
            <InputLeftElement pointerEvents="none" h="52px">
              <Icon as={FiSearch} color="faint" aria-hidden />
            </InputLeftElement>
            <Input
              aria-label="Account ID or part of a name"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="name.near, name.testnet, or a 64-character account"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={64}
              h="52px"
              bg="surface"
              borderColor="ruleStrong"
              fontFamily={draft ? 'mono' : undefined}
              fontSize="15px"
              _placeholder={{ color: 'faint' }}
            />
          </InputGroup>
          <Button type="submit" variant="brand" h="52px" px={{ base: 4, md: 6 }} flexShrink={0} isLoading={!!looking} loadingText="Looking up">
            Look up
          </Button>
        </Flex>

        {/* Exact account answer for a shared or typed ?search= that is a full account id */}
        {params.search && exact.status === 'found' && (
          <Flex mt={4} px={4} py={3} gap={3} align="center" wrap="wrap" border="1px solid" borderColor="accent" bg="accentSubtle" rounded="lg">
            <Text fontSize="sm" color="muted" w={{ base: 'full', sm: 'auto' }}>
              Exact account on {exact.network === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </Text>
            <Link as={NextLink} href={workspaceHref(exact.accountId, { network: exact.network })} fontFamily="mono" fontWeight="600" wordBreak="break-all">
              {exact.accountId}
            </Link>
            <RowHashStatus network={exact.network} accountId={exact.accountId} codeHash={exact.data.code_hash} />
            <Button as={NextLink} href={workspaceHref(exact.accountId, { network: exact.network })} size="sm" variant="brand" rightIcon={<FiArrowRight />} ml={{ sm: 'auto' }}>
              Open
            </Button>
          </Flex>
        )}
        {params.search && exact.status === 'none' && queryKind(params.search) !== 'bare' && (
          <Flex mt={4} px={4} py={3} gap={2} align="center" wrap="wrap" border="1px solid" borderColor="rule" bg="surface" rounded="lg" role="status">
            <Text fontSize="sm">
              No verified record for <Text as="span" fontFamily="mono" fontWeight="600">{exact.accountId}</Text> on {exact.networks.map((n) => (n === 'mainnet' ? 'Mainnet' : 'Testnet')).join(' or ')}.
            </Text>
            <Link href={explorerContractUrl(exact.networks[0], exact.accountId)} isExternal fontSize="sm" display="inline-flex" alignItems="center" gap={0.5}>
              View it on NearBlocks <Icon as={FiArrowUpRight} aria-hidden />
            </Link>
          </Flex>
        )}

        <Box as="section" aria-labelledby="registry-heading" mt={{ base: 8, md: 12 }}>
          <Flex align="baseline" justify="space-between" gap={3} wrap="wrap" mb={2}>
            <Heading id="registry-heading" as="h2" fontSize="md" fontWeight="650">
              {label}
            </Heading>
            <HStack spacing={2}>
              {searching && (
                <Button variant="link" size="sm" color="accent" onClick={() => navigate({ ...params, search: '', fromIndex: 0 })}>
                  Show all
                </Button>
              )}
              <FormLabel htmlFor="registry-limit" m={0} fontSize="sm" color="muted" whiteSpace="nowrap">
                Rows
              </FormLabel>
              <Select id="registry-limit" size="sm" w="72px" rounded="md" bg="surface" borderColor="ruleStrong" value={params.limit} onChange={(e) => navigate({ ...params, limit: Number(e.target.value), fromIndex: 0 })}>
                {LIMITS.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </Select>
            </HStack>
          </Flex>
          <HStack role="status" minH="22px" mb={2} spacing={2} fontSize="sm" color="muted">
            {(registry.pending || looking) && <Spinner size="xs" aria-hidden />}
            <Text as="span">{status}</Text>
            {params.search && contractSearchKey(params.search) !== params.search.toLowerCase() && !registry.pending && (
              <Text as="span" color="faint">(searched as “{contractSearchKey(params.search)}”)</Text>
            )}
          </HStack>
          {list}
          {shown && shown.contracts.length > 0 && !registry.failed && (
            <Pagination page={shownPage} pages={shownPages} onChange={(p) => navigate({ ...shown.params, fromIndex: (p - 1) * shown.params.limit })} />
          )}
        </Box>
      </Container>
    </>
  )
}
