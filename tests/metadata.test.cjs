const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  contractDir,
  isCacheableMetadata,
  metadataLoadFromError,
  metadataLoadFromValue,
  parseSourceMetadata,
} = require('../utils/contractMetadata.ts')
const { viewFunction } = require('../utils/near/view.ts')

const snapshot = 'git+https://github.com/near/example?rev=0123456789abcdef0123456789abcdef01234567'

test('well-formed NEP-330 metadata is kept exactly as published', () => {
  const metadata = parseSourceMetadata({
    version: '1.0.0',
    link: 'https://github.com/near/example',
    standards: [{ standard: 'nep330', version: '1.2.0' }, { standard: 'nep141', version: '1.0.0' }],
    build_info: {
      build_environment: 'sourcescan/cargo-near:0.13.4-rust-1.85.0@sha256:abc',
      build_command: ['cargo', 'near', 'build', 'non-reproducible-wasm'],
      contract_path: 'contracts/ft',
      source_code_snapshot: snapshot,
    },
  })
  assert.deepEqual(metadata, {
    version: '1.0.0',
    link: 'https://github.com/near/example',
    standards: [{ standard: 'nep330', version: '1.2.0' }, { standard: 'nep141', version: '1.0.0' }],
    buildInfo: {
      buildEnvironment: 'sourcescan/cargo-near:0.13.4-rust-1.85.0@sha256:abc',
      buildCommand: ['cargo', 'near', 'build', 'non-reproducible-wasm'],
      contractPath: 'contracts/ft',
      contractDir: 'contracts/ft',
      sourceCodeSnapshot: snapshot,
    },
    invalid: [],
  })
})

test('fields with the wrong type are dropped and flagged instead of rendered', () => {
  const metadata = parseSourceMetadata({
    version: {},
    link: 5,
    standards: [null, 'nep141', { standard: 'nep171', version: 1 }, { standard: 'nep330', version: '1.2.0' }],
    build_info: {
      build_environment: ['image'],
      build_command: ['cargo', 3],
      contract_path: { path: 'x' },
      source_code_snapshot: false,
    },
  })
  assert.equal(metadata.version, null)
  assert.equal(metadata.link, null)
  assert.deepEqual(metadata.standards, [{ standard: 'nep330', version: '1.2.0' }])
  assert.deepEqual(metadata.buildInfo, {
    buildEnvironment: null,
    buildCommand: null,
    contractPath: null,
    contractDir: null,
    sourceCodeSnapshot: null,
  })
  assert.deepEqual(
    [...metadata.invalid].sort(),
    ['build_command', 'build_environment', 'contract_path', 'link', 'source_code_snapshot', 'standards', 'version'].sort()
  )

  assert.deepEqual(parseSourceMetadata({ standards: 'nep141', build_info: 'cargo near' }).invalid, ['standards', 'build_info'])
  assert.equal(parseSourceMetadata({ build_info: [] }).buildInfo, null)
})

test('missing and null fields are "not specified", not invalid', () => {
  const metadata = parseSourceMetadata({ version: null, standards: null, build_info: { contract_path: null } })
  assert.deepEqual(metadata.invalid, [])
  assert.deepEqual(metadata.standards, [])
  // NEP-330: an omitted contract_path is the repository root.
  assert.equal(metadata.buildInfo.contractDir, '')
  assert.equal(parseSourceMetadata({}).buildInfo, null)
})

test('duplicate standards collapse to one entry, so list keys stay unique', () => {
  const metadata = parseSourceMetadata({
    standards: [
      { standard: 'nep141', version: '1.0.0' },
      { standard: 'nep141', version: '1.0.0' },
      { standard: 'nep141', version: '1.1.0' },
    ],
  })
  assert.deepEqual(metadata.standards, [{ standard: 'nep141', version: '1.0.0' }, { standard: 'nep141', version: '1.1.0' }])
  assert.deepEqual(metadata.invalid, [])
})

test('contract_path becomes a folder inside the snapshot only when it is a plain relative path', () => {
  for (const [path, dir] of [
    ['', ''],
    ['.', ''],
    ['./', ''],
    ['/', ''],
    ['contracts/ft', 'contracts/ft'],
    ['./contracts/ft/', 'contracts/ft'],
    ['/contracts/ft', 'contracts/ft'],
    ['../outside', null],
    ['contracts/../../outside', null],
    ['contracts//ft', null],
    ['contracts\\ft', null],
    ['contracts/\nft', null],
  ])
    assert.equal(contractDir(path), dir, JSON.stringify(path))

  const metadata = parseSourceMetadata({ build_info: { contract_path: '../outside' } })
  assert.equal(metadata.buildInfo.contractPath, '../outside')
  assert.equal(metadata.buildInfo.contractDir, null)
  assert.deepEqual(metadata.invalid, ['contract_path'])
})

test('the method result maps to ready, absent or invalid', () => {
  assert.deepEqual(metadataLoadFromValue(null), { status: 'absent', reason: 'null' })
  for (const value of [[], 'metadata', 1, true]) assert.deepEqual(metadataLoadFromValue(value), { status: 'invalid' })
  const load = metadataLoadFromValue({ version: {} })
  assert.equal(load.status, 'ready')
  assert.deepEqual(load.metadata.invalid, ['version'])
})

function viewFunctionResult(value) {
  return { result: { result: Array.from(Buffer.from(JSON.stringify(value), 'utf8')) } }
}

test('only a missing method, code or account means "no metadata"; any failed read is unknown', async (t) => {
  let response
  t.mock.method(globalThis, 'fetch', async () => response())
  const load = () =>
    viewFunction('mainnet', 'example.near', 'contract_source_metadata', undefined, new AbortController().signal).then(
      metadataLoadFromValue,
      metadataLoadFromError
    )
  const legacy = (error) => () => Response.json({ result: { error, block_height: 1 } })

  response = legacy('wasm execution failed with error: MethodResolveError(MethodNotFound)')
  assert.deepEqual(await load(), { status: 'absent', reason: 'no_method' })
  response = legacy('wasm execution failed with error: CompilationError(CodeDoesNotExist { account_id: "example.near" })')
  assert.deepEqual(await load(), { status: 'absent', reason: 'no_code' })
  response = () => Response.json({ error: { cause: { name: 'UNKNOWN_ACCOUNT' }, data: 'account example.near does not exist while viewing' } })
  assert.deepEqual(await load(), { status: 'absent', reason: 'no_account' })

  // A panic inside contract_source_metadata is not "doesn't expose it".
  response = legacy('wasm execution failed with error: HostError(GuestPanic { panic_msg: "panicked at src/lib.rs" })')
  assert.deepEqual(await load(), { status: 'unknown' })
  response = () => new Response(null, { status: 503 })
  assert.deepEqual(await load(), { status: 'unknown' })
  response = () => {
    throw new TypeError('Failed to fetch')
  }
  assert.deepEqual(await load(), { status: 'unknown' })
  response = () => Response.json({ error: { cause: { name: 'UNKNOWN_BLOCK' } } })
  assert.deepEqual(await load(), { status: 'unknown' })
  response = () => Response.json({ result: { result: Array.from(Buffer.from('{not json')) } })
  assert.deepEqual(await load(), { status: 'unknown' })

  response = () => Response.json(viewFunctionResult({ version: '1.0.0' }))
  assert.equal((await load()).status, 'ready')
})

test('failed reads are never cached, answers from the chain are', () => {
  assert.equal(isCacheableMetadata({ status: 'unknown' }), false)
  assert.equal(isCacheableMetadata({ status: 'loading' }), false)
  assert.equal(isCacheableMetadata({ status: 'absent', reason: 'no_method' }), true)
  assert.equal(isCacheableMetadata({ status: 'invalid' }), true)
  assert.equal(isCacheableMetadata(metadataLoadFromValue({})), true)
})
