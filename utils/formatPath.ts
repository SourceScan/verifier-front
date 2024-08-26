const formatSourceCodePath = (path: String, lang: String) => {
  let segments = path.split('/')

  segments.pop()
  if (lang === 'rust') {
    segments.push('src/lib.rs')
  }

  return segments.join('/')
}

const lastSegment = (path: String) => {
  let segments = path.split('/')
  return segments[segments.length - 1]
}

export { formatSourceCodePath, lastSegment }
