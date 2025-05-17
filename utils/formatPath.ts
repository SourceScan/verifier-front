const formatSourceCodePath = (path: String, lang: String) => {
  // If path is empty or undefined, return a safe default
  if (!path) {
    return ''
  }

  // For other contracts, use the path as is
  return path.toString()
}

const lastSegment = (path: String) => {
  let segments = path.split('/')
  return segments[segments.length - 1]
}

export { formatSourceCodePath, lastSegment }
