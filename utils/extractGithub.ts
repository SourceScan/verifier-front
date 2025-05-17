function extractGitHubDetails(url: string) {
  // Remove the protocol (https://) and domain (github.com/)
  const cleanUrl = url.replace(/^git\+/, '')

  // Extract the base URL and the query parameters
  const [baseUrl, queryParams] = cleanUrl.split('?')

  // Remove the '.git' suffix from the base URL
  const cleanBaseUrl = baseUrl.replace(/\.git$/, '')

  // Split the base URL to extract owner and repo
  const parts = cleanBaseUrl.replace(/^https?:\/\/github\.com\//, '').split('/')

  const owner = parts[0]
  const repo = parts[1]

  // Extract the SHA from the query parameters
  const params = new URLSearchParams(queryParams)
  const sha = params.get('rev')!

  return { owner, repo, sha }
}

export { extractGitHubDetails }
