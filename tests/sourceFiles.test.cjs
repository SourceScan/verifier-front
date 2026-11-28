const assert = require('node:assert/strict')
const { before, test } = require('node:test')

const SHA = 'a2dd140892b68140bf7e70814604d3ba074d656c'
const CONFIG = '[remote "origin"]\n\turl = https://github.com/near/intents\n'
const dir = (Name) => ({ Name, Hash: 'h', Size: 0, Type: 1 })
const file = (Name) => ({ Name, Hash: 'h', Size: 1, Type: 2 })

// sourceFiles.ts imports axios as ESM, so mock that same instance.
let axios, sf
before(async () => {
  axios = (await import('axios')).default
  sf = require('../utils/sourceFiles.ts')
})

/** Mocks the proxy: `replies` maps "structure:<path>" / "file:<path>" to a reply (or a function returning one). */
function proxy(t, replies) {
  const calls = []
  t.mock.method(axios, 'get', async (url, config) => {
    assert.equal(url, '/api/proxy-ipfs')
    const { endpoint, path } = config.params
    const key = `${endpoint}:${path}`
    calls.push(key)
    const reply = typeof replies[key] === 'function' ? await replies[key]() : replies[key]
    if (reply === undefined) throw new Error(`unexpected ${key}`)
    if (reply instanceof Error) throw reply
    return { data: reply }
  })
  return calls
}

test('a confirmed empty listing means no checkout, and that answer is kept', async (t) => {
  const calls = proxy(t, { 'structure:/': { cid: 'cid-empty', structure: [] } })
  assert.equal(await sf.readSnapshotCheckout('mainnet', 'cid-empty'), null)
  assert.equal(await sf.readSnapshotCheckout('mainnet', 'cid-empty'), null)
  assert.deepEqual(calls, ['structure:/'])
})

test('a malformed listing is unreadable, not an empty folder, and is asked again', async (t) => {
  let reply = { status: 'temporarily unavailable' }
  const calls = proxy(t, {
    'structure:/': () => reply,
    'file:.git/HEAD': `${SHA}\n`,
    'file:.git/config': CONFIG,
  })
  for (const malformed of [{ status: 'temporarily unavailable' }, { structure: 'none' }, { structure: ['.git'] }, { structure: [{ Hash: 'h' }] }, null, 'text']) {
    reply = malformed
    await assert.rejects(sf.readSnapshotCheckout('mainnet', 'cid-malformed'), /Unreadable folder listing/, JSON.stringify(malformed))
  }
  reply = { structure: [dir('.git'), file('Cargo.toml')] }
  assert.deepEqual(await sf.readSnapshotCheckout('mainnet', 'cid-malformed'), { head: `${SHA}\n`, config: CONFIG })
  assert.equal(calls.filter((c) => c === 'structure:/').length, 7)
})

test('a checkout file that is not text is unreadable and not kept', async (t) => {
  let head = { status: 'temporarily unavailable' }
  proxy(t, { 'structure:/': { structure: [dir('.git')] }, 'file:.git/HEAD': () => head, 'file:.git/config': CONFIG })
  await assert.rejects(sf.readSnapshotCheckout('mainnet', 'cid-object'), /Unreadable \.git\/HEAD/)
  head = `${SHA}\n`
  assert.deepEqual(await sf.readSnapshotCheckout('mainnet', 'cid-object'), { head, config: CONFIG })
})

test('a checkout read that never answers times out instead of waiting', async (t) => {
  proxy(t, { 'structure:/': { structure: [dir('.git')] }, 'file:.git/HEAD': () => new Promise(() => {}), 'file:.git/config': CONFIG })
  const started = Date.now()
  await assert.rejects(sf.readSnapshotCheckout('mainnet', 'cid-slow', 50), /Timed out after 50 ms/)
  assert.ok(Date.now() - started < 2000)
  assert.equal(sf.CHECKOUT_TIMEOUT_MS, 10000)
})

test('the root listing is shared, and .git itself is never listed', async (t) => {
  const calls = proxy(t, {
    'structure:/': { structure: [dir('.git'), dir('src'), dir('.github'), file('Cargo.toml')] },
    'structure:src': { structure: [file('lib.rs'), file('notes.md')] },
    'structure:.github': { structure: [] },
    'file:.git/HEAD': `${SHA}\n`,
    'file:.git/config': CONFIG,
  })
  const [checkout, listing] = await Promise.all([sf.readSnapshotCheckout('testnet', 'cid-shared'), sf.listSourcePaths('testnet', 'cid-shared', '/')])
  assert.equal(checkout.head, `${SHA}\n`)
  assert.deepEqual(listing, { paths: ['Cargo.toml', 'src/lib.rs'], partial: false })
  assert.deepEqual(calls.filter((c) => c.startsWith('structure:')).sort(), ['structure:.github', 'structure:/', 'structure:src'])
  assert.ok(!calls.some((c) => c.startsWith('structure:.git') && c !== 'structure:.github'))
})

test('a sub-folder that cannot be read makes the listing partial, and a partial listing is not kept', async (t) => {
  let src = new Error('503')
  proxy(t, { 'structure:contracts/ft': { structure: [file('Cargo.toml'), dir('src')] }, 'structure:contracts/ft/src': () => src })
  assert.deepEqual(await sf.listSourcePaths('mainnet', 'cid-partial', 'contracts/ft'), { paths: ['contracts/ft/Cargo.toml'], partial: true })
  assert.equal(sf.cachedSourcePaths('mainnet', 'cid-partial', 'contracts/ft'), undefined)
  src = { structure: [file('lib.rs')] }
  const full = { paths: ['contracts/ft/Cargo.toml', 'contracts/ft/src/lib.rs'], partial: false }
  assert.deepEqual(await sf.listSourcePaths('mainnet', 'cid-partial', 'contracts/ft'), full)
  assert.deepEqual(sf.cachedSourcePaths('mainnet', 'cid-partial', 'contracts/ft'), full.paths)
})

test('an unreadable root listing fails the whole listing', async (t) => {
  proxy(t, { 'structure:/': { status: 'temporarily unavailable' } })
  await assert.rejects(sf.listSourcePaths('mainnet', 'cid-root-bad', '/'), /Unreadable folder listing/)
})
