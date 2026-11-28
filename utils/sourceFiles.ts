import type { NetworkType } from '@/contexts/NetworkContext'
import axios from 'axios'

/** Strips a leading "<cid>/" so the proxy receives a snapshot-relative path. */
export const relativePath = (cid: string, path: string) => {
  const at = path.indexOf(cid)
  return at === -1 ? path : path.substring(at + cid.length + 1)
}

/**
 * IPFS snapshot browsing through /api/proxy-ipfs. Same traversal as before:
 * .rs/.toml files at the contract path plus one level of sub-folders.
 */
export interface SourceFile {
  name: string
  path: string
  type: string
  displayName?: string
}

/**
 * Entries of a folder listing: `{ structure: [...] }` from the SourceScan API,
 * or a bare array. Any other reply is unreadable, never an empty folder.
 */
function listingEntries(data: unknown): unknown[] {
  const structure = (data as { structure?: unknown } | null)?.structure
  if (Array.isArray(structure)) return structure
  if (Array.isArray(data)) return data
  throw new Error('Unreadable folder listing')
}

const joinPath = (dir: string, name: string) =>
  [dir.replace(/^\/+|\/+$/g, ''), name].filter(Boolean).join('/')
// One path segment: no separators and no "." / ".." that could leave the snapshot.
const safeName = (name: unknown): name is string =>
  typeof name === 'string' && name.length > 0 && name !== '.' && name !== '..' && !/[\\/]/.test(name)

/**
 * The SourceScan API returns IPFS `ls` links ({ Name, Hash, Size, Type } with
 * Type 1 = directory, 2 = file). The older { name, path, type: 'file' | 'dir' }
 * shape is accepted too. Other entry types (symlinks, unsafe names) are skipped.
 */
function toEntry(item: any, dir: string): SourceFile | null {
  // An entry that isn't a named link at all means the reply isn't a listing.
  if (!item || typeof item !== 'object' || (typeof item.Name !== 'string' && typeof item.name !== 'string'))
    throw new Error('Unreadable folder listing')
  if (safeName(item.Name) && (item.Type === 1 || item.Type === 2))
    return { name: item.Name, path: joinPath(dir, item.Name), type: item.Type === 1 ? 'dir' : 'file' }
  if (safeName(item.name) && (item.type === 'file' || item.type === 'dir'))
    return { name: item.name, path: typeof item.path === 'string' ? item.path : joinPath(dir, item.name), type: item.type }
  return null
}

const isSource = (item: any): item is SourceFile =>
  item?.type === 'file' &&
  typeof item.name === 'string' &&
  typeof item.path === 'string' &&
  (item.name.endsWith('.rs') || item.name.endsWith('.toml'))

const dirKey = (cid: string, path: string) => relativePath(cid, path).replace(/^\/+|\/+$/g, '')
const listings = new Map<string, Promise<SourceFile[]>>()

/**
 * One folder of the snapshot. Every caller shares one request per folder; a
 * snapshot is content-addressed, so a listing that was read is kept, and a
 * failed one is dropped so the next call asks again.
 */
function structure(network: NetworkType, cid: string, path: string): Promise<SourceFile[]> {
  const dir = dirKey(cid, path)
  const key = `${network}:${cid}:${dir}`
  const hit = listings.get(key)
  if (hit) return hit
  const request = axios
    .get('/api/proxy-ipfs', {
      params: { endpoint: 'structure', cid, path: dir || '/' },
      headers: { 'X-Network': network },
    })
    .then((res) => listingEntries(res.data).map((item) => toEntry(item, dir)).filter((entry): entry is SourceFile => entry !== null))
  listings.set(key, request)
  request.catch(() => listings.delete(key))
  return request
}

/**
 * .rs/.toml files at `rootPath` and one folder below it (never inside `.git`).
 * Throws when `rootPath` can't be read; `partial` is set when a sub-folder couldn't.
 */
export async function listSourceFiles(
  network: NetworkType,
  cid: string,
  rootPath: string
): Promise<{ files: SourceFile[]; partial: boolean }> {
  const root = await structure(network, cid, rootPath)
  let partial = false
  const nested = await Promise.all(
    root
      .filter((item) => item.type === 'dir' && item.name !== '.git')
      .map((dir) =>
        structure(network, cid, dir.path)
          .then((items) =>
            items.filter(isSource).map((file) => ({ ...file, displayName: `${dir.name}/${file.name}` }))
          )
          .catch(() => {
            partial = true
            return [] as SourceFile[]
          })
      )
  )
  return { files: root.filter(isSource).concat(...nested), partial }
}

export async function fetchSourceFile(
  network: NetworkType,
  cid: string,
  path: string
): Promise<string> {
  const res = await axios.get('/api/proxy-ipfs', {
    params: { endpoint: 'file', cid, path: relativePath(cid, path) },
    headers: { 'X-Network': network },
  })
  if (typeof res.data === 'string') return res.data
  if (res.data && typeof res.data === 'object')
    return typeof res.data.content === 'string'
      ? res.data.content
      : JSON.stringify(res.data, null, 2)
  throw new Error('Unreadable file content')
}

/** lib.rs for Rust contracts, otherwise the first file (as before). */
export const entryFile = (files: SourceFile[], lang?: string) =>
  (lang === 'rust' && files.find((f) => f.name === 'lib.rs')) || files[0]

/** GitHub path of the entry file, derived from NEP-330 contract_path (as before). */
export function githubEntryPath(contractPath: string | undefined, lang?: string) {
  let path = (contractPath ?? '').toString()
  if (path.endsWith('/')) path = path.slice(0, -1)
  if (lang !== 'rust') return path
  if (path.endsWith('src')) return `${path}/lib.rs`
  if (path.includes('/src/')) return `${path.split('/src/')[0]}/src/lib.rs`
  return path ? `${path}/src/lib.rs` : 'src/lib.rs'
}

/* ------------------------------------------------ workspace caches/helpers */

const listCache = new Map<string, string[]>()
const contentCache = new Map<string, string>()

/**
 * Snapshot-relative paths ("src/lib.rs") per network + snapshot + root. Only a
 * complete listing is cached; a partial one is returned with `partial` set.
 */
export async function listSourcePaths(network: NetworkType, cid: string, rootPath: string) {
  const key = `${network}:${cid}:${rootPath}`
  const hit = listCache.get(key)
  if (hit) return { paths: hit, partial: false }
  const { files, partial } = await listSourceFiles(network, cid, rootPath)
  const paths = Array.from(new Set(files.map((f) => relativePath(cid, f.path).replace(/^\/+/, '')))).sort(
    (a, b) => Number(a.includes('/')) - Number(b.includes('/')) || a.localeCompare(b)
  )
  if (!partial) listCache.set(key, paths)
  return { paths, partial }
}

export const cachedSourcePaths = (network: NetworkType, cid: string, rootPath: string) =>
  listCache.get(`${network}:${cid}:${rootPath}`)

export const cachedSource = (cid: string, path: string) => contentCache.get(`${cid}:${path}`)

export async function fetchSource(network: NetworkType, cid: string, path: string) {
  const key = `${cid}:${path}`
  const hit = contentCache.get(key)
  if (hit !== undefined) return hit
  const text = await fetchSourceFile(network, cid, path)
  contentCache.set(key, text)
  return text
}

const checkoutCache = new Map<string, { head: string; config: string } | null>()

/** A text file as the gateway returned it; any other reply is unreadable. */
async function readSnapshotText(network: NetworkType, cid: string, path: string): Promise<string> {
  const res = await axios.get('/api/proxy-ipfs', {
    params: { endpoint: 'file', cid, path },
    headers: { 'X-Network': network },
  })
  if (typeof res.data !== 'string') throw new Error(`Unreadable ${path}`)
  return res.data
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export const CHECKOUT_TIMEOUT_MS = 10_000

/**
 * `.git/HEAD` and `.git/config` of the git checkout stored at the snapshot
 * root, or null when the root listing has no `.git` folder (older SourceScan
 * snapshots don't keep one). Throws when the snapshot can't be read or
 * doesn't answer within `timeoutMs`. Only an answer that was read is kept.
 */
export async function readSnapshotCheckout(network: NetworkType, cid: string, timeoutMs = CHECKOUT_TIMEOUT_MS) {
  const key = `${network}:${cid}`
  const hit = checkoutCache.get(key)
  if (hit !== undefined) return hit
  const read = async () => {
    const root = await structure(network, cid, '/')
    if (!root.some((entry) => entry.type === 'dir' && entry.name === '.git')) return null
    const [head, config] = await Promise.all([readSnapshotText(network, cid, '.git/HEAD'), readSnapshotText(network, cid, '.git/config')])
    return { head, config }
  }
  const checkout = await withTimeout(read(), timeoutMs)
  checkoutCache.set(key, checkout)
  return checkout
}

/** lib.rs for Rust contracts, otherwise the first path (same rule as before). */
export const entryPath = (paths: string[], lang?: string) =>
  (lang === 'rust' && paths.find((p) => p === 'src/lib.rs' || p.endsWith('/lib.rs') || p === 'lib.rs')) || paths[0]
