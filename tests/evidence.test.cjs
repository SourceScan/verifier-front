const assert = require('node:assert/strict')
const { test } = require('node:test')
const { metadataLoadFromValue } = require('../utils/contractMetadata.ts')
const { chooseSourceRoot, liveRelation, liveSource, sameSource } = require('../utils/evidence.ts')
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

test('the git checkout stored in a snapshot names its repository and commit', () => {
  const config = ['[core]', '\trepositoryformatversion = 0', '[remote "origin"]', '\turl = https://github.com/near/intents', '\tfetch = +refs/heads/*:refs/remotes/origin/*', '[branch "main"]', '\tremote = origin'].join('\n')
  assert.deepEqual(githubFromGitCheckout(`${SHA}\n`, config), verified)
  assert.deepEqual(githubFromGitCheckout(SHA, config.replace('https://github.com/near/intents', 'git@github.com:near/intents.git')), verified)
  // A branch checkout, another remote or a non-GitHub remote doesn't pin a GitHub commit.
  assert.equal(githubFromGitCheckout('ref: refs/heads/main\n', config), null)
  assert.equal(githubFromGitCheckout(SHA, config.replace('[remote "origin"]', '[remote "fork"]')), null)
  assert.equal(githubFromGitCheckout(SHA, config.replace('github.com', 'gitlab.com')), null)
  assert.equal(githubFromGitCheckout(SHA, config.replace('intents\n', `intents?rev=${LATER}\n`)), null)
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

test('after a redeploy, the tree opens the snapshot root and only offers the folder from the current metadata', () => {
  const root = chooseSourceRoot(known(verified), deployedLater, null, false)
  assert.deepEqual(root, { rootPath: '/', basis: 'snapshot_root', hint: { status: 'offered', dir: 'contracts/defuse' }, verifiedDir: null })

  // The reader opens it, or follows a link to a file inside it: labelled, never "verified".
  for (const [requested, open] of [[null, true], ['contracts/defuse/src/lib.rs', false]])
    assert.deepEqual(chooseSourceRoot(known(verified), deployedLater, requested, open), {
      rootPath: 'contracts/defuse',
      basis: 'hint',
      hint: { status: 'offered', dir: 'contracts/defuse' },
      verifiedDir: null,
    })
  assert.equal(chooseSourceRoot(known(verified), deployedLater, 'contracts/defuse-old/src/lib.rs', false).rootPath, '/')
})

test('current metadata naming the recorded commit opens the verified crate folder', () => {
  for (const origin of ['record', 'snapshot'])
    assert.deepEqual(chooseSourceRoot(known(verified, origin), deployedSame, null, false), {
      rootPath: 'contracts/defuse',
      basis: 'verified',
      hint: { status: 'none' },
      verifiedDir: 'contracts/defuse',
    })
  const atRoot = live({ source_code_snapshot: `git+https://github.com/near/intents?rev=${SHA}` })
  assert.deepEqual(chooseSourceRoot(known(verified), atRoot, null, false), { rootPath: '/', basis: 'verified', hint: { status: 'none' }, verifiedDir: '' })
})

test('without a recorded repository, nothing from the current metadata is treated as verified', () => {
  for (const recorded of [{ status: 'none' }, { status: 'unknown' }]) {
    const root = chooseSourceRoot(recorded, deployedSame, null, false)
    assert.equal(root.basis, 'snapshot_root')
    assert.equal(root.rootPath, '/')
    assert.equal(root.verifiedDir, null)
    assert.deepEqual(root.hint, { status: 'offered', dir: 'contracts/defuse' })
  }
  // Still deciding: no folder is opened yet.
  assert.equal(chooseSourceRoot({ status: 'loading' }, deployedSame, null, false).rootPath, null)
  assert.equal(chooseSourceRoot(known(verified), { status: 'loading' }, null, false).rootPath, null)
})

test('a failed metadata read leaves the folder unknown, with no claim about the snapshot', () => {
  const root = chooseSourceRoot(known(verified), liveSource({ status: 'unknown' }, null), 'contracts/defuse/src/lib.rs', true)
  assert.deepEqual(root, { rootPath: '/', basis: 'snapshot_root', hint: { status: 'unknown' }, verifiedDir: null })
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
  for (const current of [unusable, { status: 'absent' }])
    assert.deepEqual(chooseSourceRoot(known(verified), current, null, true), { rootPath: '/', basis: 'snapshot_root', hint: { status: 'none' }, verifiedDir: null })
})
