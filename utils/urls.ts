import type { NetworkType } from '@/contexts/NetworkContext'

const NEARBLOCKS: Record<NetworkType, string> = {
  mainnet: 'https://nearblocks.io',
  testnet: 'https://testnet.nearblocks.io',
}

/** Public SourceScan resources (as linked from the SourceScan docs). */
export const DOCS_URL = 'https://docs.sourcescan.dev'
export const API_REFERENCE_URL = 'https://api.sourcescan.dev/'
export const GITHUB_URL = 'https://github.com/SourceScan'

/** In-app routes; kept identical to the existing URL scheme. */
export const contractPath = (accountId: string) =>
  `/contract/${encodeURIComponent(accountId)}`

/**
 * Shareable workspace link. Implicit and deterministic accounts carry their
 * network (named accounts imply it), so a shared link opens the right record.
 */
export function workspaceHref(
  accountId: string,
  opts: { network?: NetworkType; file?: string; tab?: string } = {},
  base: '/contract' | '/code' = '/contract'
) {
  const query: string[] = []
  const inferable = /\.(near|testnet)$/.test(accountId)
  if (opts.network && !inferable) query.push(`network=${opts.network}`)
  if (opts.tab && opts.tab !== 'source') query.push(`tab=${opts.tab}`)
  // Keep "/" readable in shared file links (src/lib.rs, not src%2Flib.rs).
  if (opts.file) query.push(`file=${encodeURIComponent(opts.file).replace(/%2F/g, '/')}`)
  return `${base}/${encodeURIComponent(accountId)}${query.length ? `?${query.join('&')}` : ''}`
}
export const codePath = (accountId: string) =>
  `/code/${encodeURIComponent(accountId)}`

/** NearBlocks home for the selected network. */
export const explorerHomeUrl = (network: NetworkType) => `${NEARBLOCKS[network]}/`

/**
 * NearBlocks "Contract Code" tab for an account on the network the record was
 * read from (route from NearBlocks' address/contract/code page).
 */
export const explorerContractUrl = (network: NetworkType, accountId: string) =>
  `${NEARBLOCKS[network]}/address/${encodeURIComponent(accountId)}/contract/code`

export const ipfsUrl = (cid: string) =>
  `${process.env.NEXT_PUBLIC_API_HOST}/ipfs/${encodeURIComponent(cid)}`

export const ipfsFileUrl = (cid: string, path: string) =>
  `${ipfsUrl(cid)}/${path.split('/').map(encodeURIComponent).join('/')}`

export const githubTreeUrl = (g: { owner: string; repo: string; sha: string }) =>
  `https://github.com/${g.owner}/${g.repo}/tree/${g.sha}`
