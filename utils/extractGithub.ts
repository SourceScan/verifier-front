import type { GithubDto } from '@/Interfaces/github/github.dto'

function extractGitHubDetails(url: string) {
  if (typeof url !== 'string' || !url.startsWith('git+')) {
    throw new Error('Source snapshot must use git+ URL format')
  }

  const sourceSnapshot = url.replace(/^git\+/, '')
  const { repoUrl, sha } = parseGitSnapshot(sourceSnapshot)

  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error('Source snapshot must pin a full 40-character commit SHA')
  }

  const githubPath = getGithubPath(repoUrl)
  const [owner, repo] = githubPath
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.git$/, '')
    .split('/')

  if (!owner || !repo) {
    throw new Error('Source snapshot must point to a GitHub repository')
  }

  return { owner, repo, sha }
}

function parseGitSnapshot(snapshot: string): {
  repoUrl: string
  sha: string
} {
  if (snapshot.startsWith('git@github.com:')) {
    return parseScpLikeGithubSnapshot(snapshot)
  }

  const snapshotUrl = new URL(snapshot)

  if (snapshotUrl.hostname !== 'github.com') {
    throw new Error('Source snapshot must point to a GitHub repository')
  }

  const revSha = snapshotUrl.searchParams.get('rev')
  const hashSha = snapshotUrl.hash
    ? decodeURIComponent(snapshotUrl.hash.slice(1))
    : null

  if (revSha && hashSha && revSha !== hashSha) {
    throw new Error('Source snapshot must not contain conflicting commit SHAs')
  }

  snapshotUrl.search = ''
  snapshotUrl.hash = ''

  return {
    repoUrl: snapshotUrl.toString(),
    sha: revSha || hashSha || '',
  }
}

function parseScpLikeGithubSnapshot(snapshot: string): {
  repoUrl: string
  sha: string
} {
  const revMarker = '?rev='
  const revIndex = snapshot.indexOf(revMarker)
  const hashIndex = snapshot.indexOf('#')

  if (revIndex === -1 && hashIndex === -1) {
    throw new Error('Source snapshot must pin a full 40-character commit SHA')
  }

  if (revIndex !== -1) {
    const repoUrl = snapshot.slice(0, revIndex)
    const shaWithPossibleHash = snapshot.slice(revIndex + revMarker.length)
    const [revSha, hashSha] = shaWithPossibleHash.split('#')

    if (hashSha && revSha !== hashSha) {
      throw new Error('Source snapshot must not contain conflicting commit SHAs')
    }

    return { repoUrl, sha: revSha }
  }

  return {
    repoUrl: snapshot.slice(0, hashIndex),
    sha: snapshot.slice(hashIndex + 1),
  }
}

function getGithubPath(repoUrl: string): string {
  if (repoUrl.startsWith('git@github.com:')) {
    return repoUrl.slice('git@github.com:'.length)
  }

  return new URL(repoUrl).pathname
}

// GitHub's own limits: owner 1-39 of [A-Za-z0-9-], repository 1-100 of [A-Za-z0-9._-].
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const REPO = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/
const SHA = /^[0-9a-f]{40}$/i

/** A repository and full commit SHA that are safe to put into github.com links. */
function isGithubDto(value: unknown): value is GithubDto {
  const g = value as GithubDto | null
  return (
    typeof g === 'object' && g !== null &&
    typeof g.owner === 'string' && OWNER.test(g.owner) &&
    typeof g.repo === 'string' && REPO.test(g.repo) &&
    typeof g.sha === 'string' && SHA.test(g.sha)
  )
}

/** The GitHub repository and commit a NEP-330 `source_code_snapshot` names, or null. */
function githubFromSnapshot(snapshot: unknown): GithubDto | null {
  if (typeof snapshot !== 'string') return null
  try {
    const github = extractGitHubDetails(snapshot)
    return isGithubDto(github) ? github : null
  } catch {
    return null
  }
}

/**
 * Owner and repository of a GitHub clone URL that names exactly a
 * repository: https://github.com/o/r, git@github.com:o/r or
 * ssh://git@github.com/o/r, each with an optional ".git". Anything else
 * (credentials, ports, queries, web paths such as /o/r/tree/main) is null.
 */
function githubRepoFromRemote(url: string): { owner: string; repo: string } | null {
  const m =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(url) ??
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url) ??
    /^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(url)
  return m && OWNER.test(m[1]) && REPO.test(m[2]) ? { owner: m[1], repo: m[2] } : null
}

/**
 * The repository and commit of a git checkout, from its `.git/HEAD` and
 * `.git/config`, as written by `git clone` followed by `git checkout <sha>`:
 * a detached HEAD and one `[remote "origin"]` with one plain `url`.
 * Anything that would make the answer depend on interpretation is null:
 * another HEAD form, no origin or several, a remote that differs from
 * "origin" only in case, a second url, quoted or escaped values, url
 * rewrites (`[url ...]`), includes, or the old `[remote.origin]` syntax.
 */
function githubFromGitCheckout(head: string, config: string): GithubDto | null {
  if (!/^[0-9a-f]{40}\n?$/.test(head)) return null
  const sha = head.trim()
  let section: string | null = null
  let originSections = 0
  const urls: string[] = []
  for (const raw of config.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#') || line.startsWith(';')) continue
    if (line.startsWith('[')) {
      const sub = /^\[([A-Za-z0-9.-]+) "([^"\\]*)"\]$/.exec(line)
      const plain = /^\[([A-Za-z0-9-]+)\]$/.exec(line)
      if (!sub && !plain) return null
      const name = (sub ?? plain)![1].toLowerCase()
      if (name === 'include' || name === 'includeif' || name === 'url' || name.startsWith('remote.')) return null
      if (sub && name === 'remote' && sub[2] !== 'origin' && sub[2].toLowerCase() === 'origin') return null
      section = sub && name === 'remote' && sub[2] === 'origin' ? 'origin' : 'other'
      if (section === 'origin') originSections++
      continue
    }
    if (section === null) return null
    if (section !== 'origin') continue
    const kv = /^([A-Za-z][A-Za-z0-9-]*)\s*=\s*(.*)$/.exec(line)
    if (!kv) return null
    if (kv[1].toLowerCase() !== 'url') continue
    if (/["\\;#]/.test(kv[2])) return null
    urls.push(kv[2].trim())
  }
  if (originSections !== 1 || urls.length !== 1) return null
  const repo = githubRepoFromRemote(urls[0])
  return repo ? { ...repo, sha } : null
}

export { extractGitHubDetails, githubFromGitCheckout, githubFromSnapshot, isGithubDto }
