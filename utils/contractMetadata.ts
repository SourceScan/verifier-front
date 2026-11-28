import type { RpcErrorKind } from '@/utils/near/view'

/*
 * NEP-330 `contract_source_metadata`, parsed once into a typed shape.
 *
 * The value comes from the contract, so any field can have any JSON type.
 * Fields with the wrong type are dropped and listed in `invalid`, so the UI
 * can flag them instead of rendering (or crashing on) whatever was returned.
 * Strings are kept exactly as published.
 */

export type MetadataField =
  | 'version'
  | 'link'
  | 'standards'
  | 'build_info'
  | 'build_environment'
  | 'build_command'
  | 'contract_path'
  | 'source_code_snapshot'

export interface Standard {
  standard: string
  version: string
}

export interface BuildInfo {
  buildEnvironment: string | null
  buildCommand: string[] | null
  /** `contract_path` exactly as published. */
  contractPath: string | null
  /**
   * `contract_path` as a folder inside the source snapshot ('' is the root),
   * or null when it is absent or isn't a plain relative path.
   */
  contractDir: string | null
  sourceCodeSnapshot: string | null
}

export interface SourceMetadata {
  version: string | null
  link: string | null
  /** Unique by standard + version, in published order. */
  standards: Standard[]
  buildInfo: BuildInfo | null
  /** Fields that were present with the wrong type (or, for standards, had invalid entries). */
  invalid: MetadataField[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * A relative folder of plain path segments ('' for the root). Leading "./",
 * leading and trailing slashes are tolerated; "..", "." segments, backslashes
 * and control characters are not.
 */
export function contractDir(path: string): string | null {
  const trimmed = path.trim().replace(/^(\.\/)+/, '').replace(/^\/+|\/+$/g, '')
  if (trimmed === '' || trimmed === '.') return ''
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return null
  const segments = trimmed.split('/')
  return segments.every((s) => s !== '' && s !== '.' && s !== '..') ? segments.join('/') : null
}

export function parseSourceMetadata(value: Record<string, unknown>): SourceMetadata {
  const invalid: MetadataField[] = []
  const text = (from: Record<string, unknown>, key: MetadataField): string | null => {
    const v = from[key]
    if (v === undefined || v === null) return null
    if (typeof v === 'string') return v
    invalid.push(key)
    return null
  }

  const standards: Standard[] = []
  const rawStandards = value.standards
  if (Array.isArray(rawStandards)) {
    const seen = new Set<string>()
    let skipped = false
    for (const s of rawStandards) {
      if (!isRecord(s) || typeof s.standard !== 'string' || typeof s.version !== 'string') {
        skipped = true
        continue
      }
      const key = JSON.stringify([s.standard, s.version])
      if (seen.has(key)) continue
      seen.add(key)
      standards.push({ standard: s.standard, version: s.version })
    }
    if (skipped) invalid.push('standards')
  } else if (rawStandards !== undefined && rawStandards !== null) {
    invalid.push('standards')
  }

  let buildInfo: BuildInfo | null = null
  const rawBuild = value.build_info
  if (isRecord(rawBuild)) {
    const command = rawBuild.build_command
    let buildCommand: string[] | null = null
    if (Array.isArray(command) && command.every((part) => typeof part === 'string')) buildCommand = command
    else if (command !== undefined && command !== null) invalid.push('build_command')
    // NEP-330: an omitted contract_path means the crate is at the root.
    const rawPath = rawBuild.contract_path
    let contractPath: string | null = null
    let dir: string | null = ''
    if (typeof rawPath === 'string') {
      contractPath = rawPath
      dir = contractDir(rawPath)
      if (dir === null) invalid.push('contract_path')
    } else if (rawPath !== undefined && rawPath !== null) {
      dir = null
      invalid.push('contract_path')
    }
    buildInfo = {
      buildEnvironment: text(rawBuild, 'build_environment'),
      buildCommand,
      contractPath,
      contractDir: dir,
      sourceCodeSnapshot: text(rawBuild, 'source_code_snapshot'),
    }
  } else if (rawBuild !== undefined && rawBuild !== null) {
    invalid.push('build_info')
  }

  return { version: text(value, 'version'), link: text(value, 'link'), standards, buildInfo, invalid }
}

/* ------------------------------------------------------------ load states */

export type MetadataLoad =
  | { status: 'loading' }
  | { status: 'ready'; metadata: SourceMetadata }
  /** Facts read at the latest final block: nothing to show. */
  | { status: 'absent'; reason: 'no_method' | 'no_code' | 'no_account' | 'null' }
  /** The method returned JSON that isn't a metadata object. */
  | { status: 'invalid' }
  /** The read failed (RPC failure or the call itself errored): unknown, retry. */
  | { status: 'unknown' }

/** A successful `contract_source_metadata` call, as a load state. */
export function metadataLoadFromValue(value: unknown): MetadataLoad {
  if (value === null) return { status: 'absent', reason: 'null' }
  if (!isRecord(value)) return { status: 'invalid' }
  return { status: 'ready', metadata: parseSourceMetadata(value) }
}

/**
 * A failed call, as a load state. Only errors that state a fact about the
 * account or its code mean "no metadata"; a panic inside the method, a
 * provider error or a malformed response leaves the metadata unknown.
 */
export function metadataLoadFromError(error: unknown): MetadataLoad {
  const kind = (error as { kind?: RpcErrorKind } | null)?.kind
  if (kind === 'method_not_found') return { status: 'absent', reason: 'no_method' }
  if (kind === 'no_contract_code') return { status: 'absent', reason: 'no_code' }
  if (kind === 'unknown_account') return { status: 'absent', reason: 'no_account' }
  return { status: 'unknown' }
}

/** Only answers read from the chain are cached; failures are retried on the next visit. */
export const isCacheableMetadata = (load: MetadataLoad) =>
  load.status === 'ready' || load.status === 'absent' || load.status === 'invalid'
