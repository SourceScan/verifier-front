const assert = require('node:assert/strict')
const { test } = require('node:test')
const { metadataLoadFromValue } = require('../utils/contractMetadata.ts')
const { chooseSourceRoot, isSnapshotFilePath, linkedDir, liveRelation, liveSource, sameSource } = require('../utils/evidence.ts')
const { githubFromGitCheckout, githubFromSnapshot, isGithubDto } = require('../utils/extractGithub.ts')

const SHA = 'a2dd140892b68140bf7e70814604d3ba074d656c'
const LATER = '16d04f6ec4401263f8914638710260da50bb46b0'
const verified = { owner: 'near', repo: 'intents', sha: SHA }
const known = (github, origin = 'snapshot') => ({ status: 'known', github, origin })

/** Live source as the page builds it from a contract_source_metadata result. */
function live(buildInfo) {
  const load = metadataLoadFromValue({ build_info: buildInfo })
  return liveSource(load, githubFromSnapshot(buildInfo.source_code_snapshot))
}
const deployedLater = live({ source_code_snapshot: `git+https://github.com/near/intents?rev=${LATER}`, contract_path: 'contracts/defuse' })
const deployedSame = live({ source_code_snapshot: `git+https://github.com/near/intents?rev=${SHA}`, contract_path: 'contracts/defuse' })

test('a snapshot string is parsed into a link-safe repository and full commit, or nothing', () => {
  assert.deepEqual(githubFromSnapshot(`git+https://github.com/near/intents.git?rev=${SHA}`), verified)
  assert.deepEqual(githubFromSnapshot(`git+git@github.com:near/intents.git#${SHA}`), verified)
  for (const value of [
    undefined,
    null,
    {},
    `https://github.com/near/intents?rev=${SHA}`,
    `git+https://gitlab.com/near/intents?rev=${SHA}`,
    'git+https://github.com/near/intents?rev=main',
    `git+https://github.com/near%2F..%2Fx/intents?rev=${SHA}`,
    `git+https://github.com/-near/intents?rev=${SHA}`,
  ])
    assert.equal(githubFromSnapshot(value), null, String(value))

  assert.equal(isGithubDto(verified), true)
  for (const value of [null, { ...verified, sha: SHA.slice(0, 12) }, { ...verified, repo: '..' }, { ...verified, owner: 'a/b' }, { owner: 'near', repo: 'intents' }])
    assert.equal(isGithubDto(value), false)
})

const CLONE_CONFIG = [
  '[core]',
  '\trepositoryformatversion = 0',
  '\tfilemode = true',
  '\tbare = false',
  '\tlogallrefupdates = true',
  '[remote "origin"]',
  '\turl = https://github.com/near/intents',
  '\tfetch = +refs/heads/*:refs/remotes/origin/*',
  '[branch "main"]',
  '\tremote = origin',
  '\tmerge = refs/heads/main',
  '',
].join('\n')

test('the git checkout stored in a snapshot names its repository and commit', () => {
  assert.deepEqual(githubFromGitCheckout(`${SHA}\n`, CLONE_CONFIG), verified)
  for (const url of ['https://github.com/near/intents.git', 'https://github.com/near/intents/', 'git@github.com:near/intents.git', 'ssh://git@github.com/near/intents.git'])
    assert.deepEqual(githubFromGitCheckout(SHA, CLONE_CONFIG.replace('https://github.com/near/intents', url)), verified, url)
})

test('a git checkout that is ambiguous or not a plain GitHub clone names nothing', () => {
  const variants = {
    'branch HEAD': ['ref: refs/heads/main\n', CLONE_CONFIG],
    'uppercase HEAD': [`${SHA.toUpperCase()}\n`, CLONE_CONFIG],
    'HEAD with extra lines': [`${SHA}\n${LATER}\n`, CLONE_CONFIG],
    'no origin': [SHA, CLONE_CONFIG.replace('[remote "origin"]', '[remote "fork"]')],
    'origin and Origin': [SHA, `${CLONE_CONFIG}[remote "Origin"]\n\turl = https://github.com/someone/intents\n`],
    'two origin sections': [SHA, `${CLONE_CONFIG}[remote "origin"]\n\turl = https://github.com/someone/intents\n`],
    'two origin urls': [SHA, CLONE_CONFIG.replace('\tfetch =', '\turl = https://github.com/someone/intents\n\tfetch =')],
    'old [remote.origin] syntax': [SHA, CLONE_CONFIG.replace('[remote "origin"]', '[remote.origin]')],
    'url rewrite': [SHA, `${CLONE_CONFIG}[url "https://github.com/someone/"]\n\tinsteadOf = https://github.com/near/\n`],
    include: [SHA, `[include]\n\tpath = other\n${CLONE_CONFIG}`],
    'quoted url': [SHA, CLONE_CONFIG.replace('url = https://github.com/near/intents', 'url = "https://github.com/near/intents"')],
    'url with comment': [SHA, CLONE_CONFIG.replace('near/intents', 'near/intents ; fork')],
    'web path': [SHA, CLONE_CONFIG.replace('near/intents', 'near/intents/tree/main')],
    'extra path segment': [SHA, CLONE_CONFIG.replace('near/intents', 'near/intents/extra')],
    credentials: [SHA, CLONE_CONFIG.replace('https://github.com', 'https://user@github.com')],
    query: [SHA, CLONE_CONFIG.replace('near/intents', `near/intents?rev=${LATER}`)],
    'other host': [SHA, CLONE_CONFIG.replace('github.com', 'gitlab.com')],
    'key before any section': [SHA, `url = https://github.com/near/intents\n${CLONE_CONFIG}`],
  }
  for (const [name, [head, config]] of Object.entries(variants)) assert.equal(githubFromGitCheckout(head, config), null, name)
})

test('only the same repository and commit count as the same source', () => {
  assert.equal(sameSource(verified, { owner: 'Near', repo: 'Intents', sha: SHA.toUpperCase() }), true)
  assert.equal(sameSource(verified, { ...verified, sha: LATER }), false)
  // A fork has the same commit but is not the recorded repository.
  assert.equal(sameSource(verified, { ...verified, owner: 'someone' }), false)

  assert.equal(liveRelation(known(verified), deployedSame), 'same')
  assert.equal(liveRelation(known(verified), deployedLater), 'different')
  for (const recorded of [{ status: 'none' }, { status: 'unknown' }, { status: 'loading' }]) assert.equal(liveRelation(recorded, deployedLater), null)
  assert.equal(liveRelation(known(verified), { status: 'unknown' }), null)
})

test('the folder from the current metadata is always labelled, never the verified crate', () => {
  // Same repository and commit as the record, two crates in that tree: the path still only comes from current metadata.
  for (const dir of ['contracts/ft', 'contracts/nft']) {
    const current = live({ source_code_snapshot: `git+https://github.com/near/intents?rev=${SHA}`, contract_path: dir })
    assert.equal(liveRelation(known(verified), current), 'same')
    assert.deepEqual(chooseSourceRoot(current, null, 'metadata'), { rootPath: dir, basis: 'current_metadata', hint: { status: 'offered', dir } })
  }
  // A later commit is treated the same way: labelled, with the snapshot root one click away.
  assert.deepEqual(chooseSourceRoot(deployedLater, null, 'metadata'), { rootPath: 'contracts/defuse', basis: 'current_metadata', hint: { status: 'offered', dir: 'contracts/defuse' } })
  assert.deepEqual(chooseSourceRoot(deployedLater, null, 'root'), { rootPath: '/', basis: 'snapshot_root', hint: { status: 'offered', dir: 'contracts/defuse' } })
  // The choice never depends on the recorded source, so its read can't hold up the tree.
  assert.equal(chooseSourceRoot.length, 3)
})

test('a ?file= link opens its own folder, without waiting for the metadata', () => {
  const link = 'contracts/ft/src/lib.rs'
  for (const current of [{ status: 'loading' }, { status: 'unknown' }, { status: 'absent' }])
    assert.equal(chooseSourceRoot(current, link, 'metadata').rootPath, 'contracts/ft', current.status)
  assert.deepEqual(chooseSourceRoot({ status: 'unknown' }, link, 'metadata'), { rootPath: 'contracts/ft', basis: 'link', hint: { status: 'unknown' } })
  // Inside the current metadata's folder, that folder opens (labelled); elsewhere, the link's own folder.
  assert.equal(chooseSourceRoot(deployedLater, 'contracts/defuse/src/a/b.rs', 'metadata').basis, 'current_metadata')
  assert.deepEqual(chooseSourceRoot(deployedLater, link, 'metadata'), { rootPath: 'contracts/ft', basis: 'link', hint: { status: 'offered', dir: 'contracts/defuse' } })
  // The reader chose the snapshot root: a file listed there keeps it.
  assert.equal(chooseSourceRoot(deployedLater, 'contracts/Cargo.toml', 'root').rootPath, '/')
  assert.equal(chooseSourceRoot(deployedLater, 'Cargo.toml', 'metadata').rootPath, '/')
  // Without a link, the tree waits for the metadata.
  assert.deepEqual(chooseSourceRoot({ status: 'loading' }, null, 'metadata'), { rootPath: null, basis: 'pending', hint: { status: 'none' } })
  // A path that could leave the snapshot is ignored.
  assert.equal(chooseSourceRoot({ status: 'absent' }, '../x/src/lib.rs', 'metadata').rootPath, '/')
})

test('linked files map to their crate folder; unsafe paths are not snapshot paths', () => {
  for (const [file, dir] of [
    ['src/lib.rs', ''],
    ['Cargo.toml', ''],
    ['contracts/ft/src/lib.rs', 'contracts/ft'],
    ['contracts/ft/src/a/src/b.rs', 'contracts/ft'],
    ['contracts/ft/Cargo.toml', 'contracts/ft'],
    ['a/b/c.rs', 'a/b'],
  ])
    assert.equal(linkedDir(file), dir, file)
  for (const path of ['src/lib.rs', 'a/b.toml']) assert.equal(isSnapshotFilePath(path), true, path)
  for (const path of ['', '/src/lib.rs', 'a//b.rs', '../a.rs', 'a/./b.rs', 'a\\b.rs', 'a/\nb.rs']) assert.equal(isSnapshotFilePath(path), false, JSON.stringify(path))
})

test('a failed metadata read leaves the folder unknown, with no claim about the snapshot', () => {
  assert.deepEqual(chooseSourceRoot(liveSource({ status: 'unknown' }, null), null, 'metadata'), { rootPath: '/', basis: 'snapshot_root', hint: { status: 'unknown' } })
})

test('no metadata, no build info or an unusable contract path offers nothing', () => {
  for (const load of [
    { status: 'absent', reason: 'no_method' },
    { status: 'absent', reason: 'no_code' },
    { status: 'invalid' },
    metadataLoadFromValue({ version: '1.0.0' }),
  ])
    assert.deepEqual(liveSource(load, null), { status: 'absent' })

  const unusable = live({ source_code_snapshot: `git+https://github.com/near/intents?rev=${SHA}`, contract_path: '../outside' })
  assert.deepEqual(unusable, { status: 'ready', github: verified, contractDir: null })
  const atRoot = live({ source_code_snapshot: `git+https://github.com/near/intents?rev=${SHA}` })
  for (const current of [unusable, atRoot, { status: 'absent' }])
    assert.deepEqual(chooseSourceRoot(current, null, 'metadata'), { rootPath: '/', basis: 'snapshot_root', hint: { status: 'none' } })
})
