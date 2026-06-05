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

export { extractGitHubDetails }
