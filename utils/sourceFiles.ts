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

const asList = (data: any): any[] => {
  if (data?.structure)
    return Array.isArray(data.structure) ? data.structure : [data.structure]
  if (Array.isArray(data)) return data
  return data && typeof data === 'object' ? [data] : []
}

const joinPath = (dir: string, name: string) =>
  [dir.replace(/^\/+|\/+$/g, ''), name].filter(Boolean).join('/')
// One path segment: no separators and no "." / ".." that could leave the snapshot.
const safeName = (name: unknown): name is string =>
  typeof name === 'string' && name.length > 0 && name !== '.' && name !== '..' && !/[\\/]/.test(name)

/**
 * The SourceScan API returns IPFS `ls` links ({ Name, Hash, Size, Type } with
 * Type 1 = directory, 2 = file). The older { name, path, type: 'file' | 'dir' }
 * shape is accepted too. Anything else is ignored.
 */
function toEntry(item: any, dir: string): SourceFile | null {
  if (!item || typeof item !== 'object') return null
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

async function structure(network: NetworkType, cid: string, path: string): Promise<SourceFile[]> {
  const res = await axios.get('/api/proxy-ipfs', {
    params: { endpoint: 'structure', cid, path },
    headers: { 'X-Network': network },
  })
  const dir = relativePath(cid, path)
  return asList(res.data)
    .map((item) => toEntry(item, dir))
    .filter((entry): entry is SourceFile => entry !== null)
}

/** Throws when the snapshot root cannot be read; unreadable sub-folders are skipped. */
export async function listSourceFiles(
  network: NetworkType,
  cid: string,
  rootPath: string
): Promise<SourceFile[]> {
  const root = await structure(network, cid, rootPath)
  const nested = await Promise.all(
    root
      .filter((item) => item.type === 'dir')
      .map((dir) =>
        structure(network, cid, dir.path)
          .then((items) =>
            items.filter(isSource).map((file) => ({ ...file, displayName: `${dir.name}/${file.name}` }))
          )
          .catch(() => [] as SourceFile[])
      )
  )
  return root.filter(isSource).concat(...nested)
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

/** Snapshot-relative paths ("src/lib.rs"), cached per network + snapshot + root. */
export async function listSourcePaths(network: NetworkType, cid: string, rootPath: string) {
  const key = `${network}:${cid}:${rootPath}`
  const hit = listCache.get(key)
  if (hit) return hit
  const files = await listSourceFiles(network, cid, rootPath)
  const paths = Array.from(new Set(files.map((f) => relativePath(cid, f.path).replace(/^\/+/, '')))).sort(
    (a, b) => Number(a.includes('/')) - Number(b.includes('/')) || a.localeCompare(b)
  )
  listCache.set(key, paths)
  return paths
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

/** lib.rs for Rust contracts, otherwise the first path (same rule as before). */
export const entryPath = (paths: string[], lang?: string) =>
  (lang === 'rust' && paths.find((p) => p === 'src/lib.rs' || p.endsWith('/lib.rs') || p === 'lib.rs')) || paths[0]
