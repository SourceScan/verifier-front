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
 * The repository and commit of a git checkout, from its `.git/HEAD` (a
 * detached commit) and the `origin` remote in `.git/config`. Null unless both
 * name a GitHub repository and a full commit SHA.
 */
function githubFromGitCheckout(head: string, config: string): GithubDto | null {
  const sha = head.trim()
  if (!SHA.test(sha)) return null
  let section = ''
  let url: string | null = null
  for (const raw of config.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('[')) {
      section = line.replace(/\s+/g, ' ').toLowerCase()
      continue
    }
    const m = section === '[remote "origin"]' ? /^url\s*=\s*(.+)$/i.exec(line) : null
    if (m) url = m[1].trim()
  }
  if (!url || /[?#\s]/.test(url)) return null
  return githubFromSnapshot(`git+${url}#${sha}`)
}

export { extractGitHubDetails, githubFromGitCheckout, githubFromSnapshot, isGithubDto }
