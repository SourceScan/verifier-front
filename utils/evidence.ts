import type { GithubDto } from '@/Interfaces/github/github.dto'
import type { MetadataLoad } from '@/utils/contractMetadata'

/*
 * Which source a verification record refers to, and how the contract's
 * current NEP-330 metadata may be used next to it.
 *
 * The registry records the IPFS snapshot (cid), the code hash and the block;
 * it records neither a repository nor the crate that was built. The metadata
 * read now describes whatever is deployed today, which can be a later build.
 * So the recorded repository and commit come only from the record or from the
 * git checkout inside its snapshot, and anything taken from the current
 * metadata (its commit, its contract path) is shown labelled as such. Even
 * when it names the recorded commit, its contract path is not the verified
 * crate: one commit can hold several crates.
 */

/** Repository and commit of the recorded snapshot. */
export type RecordedSource =
  | { status: 'loading' }
  /** From the registry record, or from the git checkout stored in the recorded snapshot. */
  | { status: 'known'; github: GithubDto; origin: 'record' | 'snapshot' }
  /**
   * Not recorded: the snapshot has no git checkout (`no_checkout`), or its
   * checkout doesn't name exactly one GitHub repository and commit (`unidentified`).
   */
  | { status: 'none'; reason: 'no_checkout' | 'unidentified' }
  /** The snapshot couldn't be read (or didn't answer in time), so it is unknown. */
  | { status: 'unknown' }

/** The contract's current NEP-330 build source, read at the latest final block. */
export type LiveSource =
  | { status: 'loading' }
  /**
   * `contractDir`: folder inside the source ('' = root), or null when the
   * metadata has no usable contract path.
   */
  | { status: 'ready'; github: GithubDto | null; contractDir: string | null }
  /** No metadata, or no build info, at the latest final block. */
  | { status: 'absent' }
  /** The metadata read failed. */
  | { status: 'unknown' }

/** `github` is the repository parsed from the metadata's `source_code_snapshot`, if any. */
export function liveSource(load: MetadataLoad, github: GithubDto | null): LiveSource {
  if (load.status === 'loading' || load.status === 'unknown') return { status: load.status }
  if (load.status !== 'ready' || !load.metadata.buildInfo) return { status: 'absent' }
  return { status: 'ready', github, contractDir: load.metadata.buildInfo.contractDir }
}

/** Same repository (GitHub names are case-insensitive) at the same commit. */
export const sameSource = (a: GithubDto, b: GithubDto) =>
  a.owner.toLowerCase() === b.owner.toLowerCase() &&
  a.repo.toLowerCase() === b.repo.toLowerCase() &&
  a.sha.toLowerCase() === b.sha.toLowerCase()

/** How the current metadata relates to the recorded snapshot, when that is known. */
export function liveRelation(recorded: RecordedSource, live: LiveSource): 'same' | 'different' | null {
  if (recorded.status !== 'known' || live.status !== 'ready' || !live.github) return null
  return sameSource(recorded.github, live.github) ? 'same' : 'different'
}

export type FolderHint =
  | { status: 'none' }
  /** The current metadata names this folder; nothing ties it to the verified crate. */
  | { status: 'offered'; dir: string }
  /** The metadata read failed, so whether it names a folder is unknown. */
  | { status: 'unknown' }

/** The reader's choice for the current metadata's folder: follow it (default) or show the snapshot root. */
export type FolderChoice = 'metadata' | 'root'

export interface SourceRoot {
  /** Snapshot folder to list ('/' = snapshot root); null while it can't be decided yet. */
  rootPath: string | null
  /**
   * current_metadata: the folder named in the contract's current metadata (always labelled)
   * link: the folder of the file a `?file=` link names
   * snapshot_root: the root of the snapshot
   */
  basis: 'pending' | 'current_metadata' | 'link' | 'snapshot_root'
  hint: FolderHint
}

/** A file path inside the snapshot: plain segments, no "." or "..", no backslashes or control characters. */
export const isSnapshotFilePath = (path: string) =>
  // eslint-disable-next-line no-control-regex
  !/[\\\u0000-\u001f\u007f]/.test(path) && path.split('/').every((s) => s !== '' && s !== '.' && s !== '..')

/** The crate folder a linked file sits in: the part before its first `src/`, else its folder ('' = root). */
export function linkedDir(file: string): string {
  const crate = /^(?:(.*?)\/)?src\//.exec(file)
  if (crate) return crate[1] ?? ''
  return file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : ''
}

/** Whether listing `dir` (its files and one folder below) shows `file`. */
const covers = (dir: string, file: string) => {
  const rest = dir === '' ? file : file.startsWith(`${dir}/`) ? file.slice(dir.length + 1) : null
  return rest !== null && rest.split('/').length <= 2
}

/**
 * Picks the snapshot folder the source tree opens at, in this order:
 * 1. the snapshot root, when the reader chose it and the link (if any) is listed there;
 * 2. the current metadata's folder, when the link is inside it;
 * 3. the linked file's own folder;
 * 4. the current metadata's folder (labelled as such), or else the snapshot root.
 * It depends only on the current metadata, the `?file=` link and the reader's
 * choice, never on the recorded-source read, so that read can't hold up
 * browsing. A link opens at once, without waiting for the metadata.
 */
export function chooseSourceRoot(live: LiveSource, requested: string | null, choice: FolderChoice): SourceRoot {
  const link = requested && isSnapshotFilePath(requested) ? requested : null
  const hint: FolderHint =
    live.status === 'unknown'
      ? { status: 'unknown' }
      : live.status === 'ready' && live.contractDir
        ? { status: 'offered', dir: live.contractDir }
        : { status: 'none' }
  const metaDir = hint.status === 'offered' ? hint.dir : null
  const at = (dir: string, basis: SourceRoot['basis']): SourceRoot =>
    dir ? { rootPath: dir, basis, hint } : { rootPath: '/', basis: 'snapshot_root', hint }

  if (!link && live.status === 'loading') return { rootPath: null, basis: 'pending', hint }
  if (choice === 'root' && (!link || covers('', link))) return at('', 'snapshot_root')
  if (link && metaDir !== null && link.startsWith(`${metaDir}/`)) return at(metaDir, 'current_metadata')
  if (link) return at(linkedDir(link), 'link')
  return metaDir !== null ? at(metaDir, 'current_metadata') : at('', 'snapshot_root')
}
