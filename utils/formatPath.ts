const formatSourceCodePath = (path: String, lang: String) => {
  // If path is empty or undefined, return a safe default
  if (!path) {
    return ''
  }

  // Normalize the path to ensure it doesn't have a trailing slash
  let normalizedPath = path.toString()

  // Remove trailing slash if present
  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1)
  }

  return normalizedPath
}

// This function helps construct GitHub URLs for Rust contracts
// by ensuring the proper path to lib.rs or Cargo.toml based on the provided contract path
const getGithubFilePath = (
  contractPath: string,
  lang: string,
  file: string
) => {
  if (!contractPath) return lang === 'rust' ? `src/${file}` : ''

  const normalizedPath = contractPath.endsWith('/')
    ? contractPath.slice(0, -1)
    : contractPath

  if (lang !== 'rust') return normalizedPath

  // For Rust projects, handle the path structure correctly
  if (normalizedPath.endsWith('src')) {
    return `${normalizedPath}/${file}`
  } else if (normalizedPath.includes('/src/')) {
    // If the path already includes a /src/ directory
    const parts = normalizedPath.split('/src/')
    return `${parts[0]}/src/${file}`
  } else {
    // For other path patterns, add /src/ before the file
    return normalizedPath ? `${normalizedPath}/src/${file}` : `src/${file}`
  }
}

const lastSegment = (path: String) => {
  let segments = path.split('/')
  return segments[segments.length - 1]
}

export { formatSourceCodePath, getGithubFilePath, lastSegment }
