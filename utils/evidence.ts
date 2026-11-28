import type { GithubDto } from '@/Interfaces/github/github.dto'
import type { MetadataLoad } from '@/utils/contractMetadata'

/*
 * Which source a verification record refers to, and when the contract's
 * current NEP-330 metadata may stand in for it.
 *
 * The registry records the IPFS snapshot (cid), the code hash and the block;
 * it does not record a repository or contract path. The metadata read now
 * describes whatever is deployed today, which can be a later build. So it is
 * applied to the recorded snapshot only when it names the same repository and
 * commit as the record itself; otherwise it is only shown labelled as current
 * metadata, or offered as a folder the reader can choose to open.
 */

/** Repository and commit of the recorded snapshot. */
export type RecordedSource =
  | { status: 'loading' }
  /** From the registry record, or from the git checkout stored in the recorded snapshot. */
  | { status: 'known'; github: GithubDto; origin: 'record' | 'snapshot' }
  /** Neither the record nor the snapshot names one. */
  | { status: 'none' }
  /** The snapshot couldn't be read, so it is unknown. */
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
  /** The current metadata names this folder, but nothing ties it to the recorded snapshot. */
  | { status: 'offered'; dir: string }
  /** The metadata read failed, so whether it names a folder is unknown. */
  | { status: 'unknown' }

export interface SourceRoot {
  /** Snapshot folder to list ('/' = snapshot root); null while it can't be decided yet. */
  rootPath: string | null
  /**
   * verified: the crate folder of the recorded source (the metadata names the same commit)
   * snapshot_root: the root of the snapshot, because no folder is tied to the record
   * hint: the folder the current metadata names, opened by the reader or by a link into it
   */
  basis: 'pending' | 'verified' | 'snapshot_root' | 'hint'
  hint: FolderHint
  /** Crate folder of the recorded source ('' = root), when it is known. */
  verifiedDir: string | null
}

const inDir = (file: string | null, dir: string) => !!file && file.startsWith(`${dir}/`)

/**
 * Picks the snapshot folder the source tree opens at.
 * `requested` is the `?file=` path; `openHint` is the reader's choice to open the offered folder.
 */
export function chooseSourceRoot(recorded: RecordedSource, live: LiveSource, requested: string | null, openHint: boolean): SourceRoot {
  const atRoot = (hint: FolderHint): SourceRoot => ({ rootPath: '/', basis: 'snapshot_root', hint, verifiedDir: null })
  if (live.status === 'loading') return { rootPath: null, basis: 'pending', hint: { status: 'none' }, verifiedDir: null }
  if (live.status === 'unknown') return atRoot({ status: 'unknown' })
  if (live.status === 'absent' || live.contractDir === null) return atRoot({ status: 'none' })

  const dir = live.contractDir
  if (liveRelation(recorded, live) === 'same')
    return { rootPath: dir || '/', basis: 'verified', hint: { status: 'none' }, verifiedDir: dir }
  // A root crate path opens the root either way; nothing to offer.
  if (dir === '') return atRoot({ status: 'none' })
  // Wait for the snapshot before deciding, so the tree doesn't open one folder and jump to another.
  if (recorded.status === 'loading') return { rootPath: null, basis: 'pending', hint: { status: 'none' }, verifiedDir: null }
  const hint: FolderHint = { status: 'offered', dir }
  return openHint || inDir(requested, dir) ? { rootPath: dir, basis: 'hint', hint, verifiedDir: null } : atRoot(hint)
}
