const getDockerHubLink = (buildEnvironment: string) => {
  const regex = /([^/]+)\/([^:]+):([^@]+)@sha256:(.+)/
  const match = buildEnvironment.match(regex)
  if (match) {
    const [, user, repo, tag, sha] = match
    return `https://hub.docker.com/layers/${user}/${repo}/${tag}/images/sha256-${sha}?context=explore`
  }
  return ''
}

// Function to extract the image name and digest
const getImageNameAndDigest = (buildEnvironment: string) => {
  const regex = /([^/]+)\/([^:]+):([^@]+)@sha256:(.+)/
  const match = buildEnvironment.match(regex)
  if (match) {
    const [, user, repo, tag, sha] = match
    const imageName = `${user}/${repo}:${tag}`
    const digest = `sha256:${sha}`
    return { imageName, digest }
  }
  return { imageName: buildEnvironment, digest: '' }
}

export { getDockerHubLink, getImageNameAndDigest }
