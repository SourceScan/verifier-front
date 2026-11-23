/**
 * NEP-330 `build_info.build_environment` is a container image reference such as
 * `sourcescan/cargo-near:0.13.4-rust-1.85.0@sha256:<64 hex>`. The exact string
 * is the provenance claim and is always shown as-is; this module only decides
 * whether a registry page can be linked for it.
 */

export interface ImageRef {
  /** Registry host; Docker Hub references are normalised to `docker.io`. */
  registry: string
  /** Repository path within the registry (`library/rust` for official Docker Hub images). */
  repository: string
  tag?: string
  /** `sha256:<64 hex>` */
  digest?: string
}

const COMPONENT = /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/
const TAG = /^\w[\w.-]{0,127}$/
const DIGEST = /^sha256:[a-f0-9]{64}$/
const HOST = /^(?:localhost|[a-z0-9-]+(?:\.[a-z0-9-]+)+|[a-z0-9-]+:\d+|[a-z0-9-]+(?:\.[a-z0-9-]+)+:\d+)$/
const DOCKER_HUB_HOSTS = new Set(['docker.io', 'index.docker.io', 'registry-1.docker.io'])

/** Parses a Docker/OCI image reference; returns null for anything that is not one. */
export function parseImageRef(value: string): ImageRef | null {
  const raw = value.trim()
  if (!raw || raw.length > 512 || /\s/.test(raw)) return null
  const at = raw.indexOf('@')
  const nameTag = at === -1 ? raw : raw.slice(0, at)
  const digest = at === -1 ? undefined : raw.slice(at + 1)
  if (digest !== undefined && !DIGEST.test(digest)) return null

  const slash = nameTag.lastIndexOf('/')
  const colon = nameTag.lastIndexOf(':')
  const tag = colon > slash ? nameTag.slice(colon + 1) : undefined
  const name = colon > slash ? nameTag.slice(0, colon) : nameTag
  if (tag !== undefined && !TAG.test(tag)) return null

  const parts = name.split('/')
  let registry = 'docker.io'
  if (parts.length > 1 && (parts[0] === 'localhost' || /[.:]/.test(parts[0]))) {
    registry = (parts.shift() as string).toLowerCase()
    if (!HOST.test(registry)) return null
  }
  if (!parts.length || !parts.every((p) => COMPONENT.test(p))) return null
  if (DOCKER_HUB_HOSTS.has(registry)) {
    registry = 'docker.io'
    if (parts.length === 1) parts.unshift('library')
  }
  return { registry, repository: parts.join('/'), tag, digest }
}

export interface RegistryPage {
  url: string
  /** Registry name for the link text, e.g. "Docker Hub". */
  name: string
}

/**
 * The registry's own page for this image, only for registries whose page
 * layout is known. Any other registry is shown as plain text.
 */
export function registryPage(ref: ImageRef): RegistryPage | null {
  const segments = ref.repository.split('/')
  if (ref.registry === 'docker.io' && segments.length === 2) {
    const [namespace, repo] = segments.map(encodeURIComponent)
    if (ref.tag && ref.digest) {
      // Docker Hub's page for this exact tag and image digest.
      const tag = encodeURIComponent(ref.tag)
      return { name: 'Docker Hub', url: `https://hub.docker.com/layers/${namespace}/${repo}/${tag}/images/${ref.digest.replace(':', '-')}` }
    }
    return { name: 'Docker Hub', url: namespace === 'library' ? `https://hub.docker.com/_/${repo}` : `https://hub.docker.com/r/${namespace}/${repo}` }
  }
  if (ref.registry === 'ghcr.io' && segments.length >= 2) {
    // ghcr.io redirects a package path to its GitHub package page (user or org).
    return { name: 'GitHub Container Registry', url: `https://ghcr.io/${segments.map(encodeURIComponent).join('/')}` }
  }
  return null
}
