const assert = require('node:assert/strict')
const { test } = require('node:test')
const { verificationLabel } = require('../utils/contracts.ts')
const { readViewCode } = require('../utils/near/response.ts')
const { fetchViewCode } = require('../utils/near/viewCode.ts')
const { fetchRegistryCount } = require('../utils/registryCount.ts')

const hash = '56xEo2LorUFVNbkFhCncFSWNiobdp1kzm14nZ47b5JVW'

test('registry labels use the recorded block and handle missing heights', () => {
  assert.equal(verificationLabel(150), 'Verified at #150')
  assert.equal(verificationLabel('9007199254740993'), 'Verified at #9007199254740993')
  assert.equal(verificationLabel(undefined), 'Verification recorded')
  assert.equal(verificationLabel({ height: 150 }), 'Verification recorded')
})

test('count uses the configured public host, selected network, and abort signal', async (t) => {
  const originalHost = process.env.NEXT_PUBLIC_API_HOST
  process.env.NEXT_PUBLIC_API_HOST = 'https://backend.example/'
  t.after(() => {
    if (originalHost === undefined) delete process.env.NEXT_PUBLIC_API_HOST
    else process.env.NEXT_PUBLIC_API_HOST = originalHost
  })

  const { signal } = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://backend.example/api/contracts/count?networkId=testnet')
    assert.equal(init.method ?? 'GET', 'GET')
    assert.equal(init.credentials, 'omit')
    assert.strictEqual(init.signal, signal)
    return Response.json({ networkId: 'testnet', count: '0' })
  })

  assert.equal(await fetchRegistryCount('testnet', signal), 0)
})

test('count rejects an incorrect network and invalid counts', async (t) => {
  const { signal } = new AbortController()
  let payload
  t.mock.method(globalThis, 'fetch', async () => Response.json(payload))

  payload = { networkId: 'testnet', count: 12 }
  await assert.rejects(fetchRegistryCount('mainnet', signal), /Unexpected registry count/)
  for (const count of [null, true, '', -1, 1.1, '1e3', '9007199254740992']) {
    payload = { networkId: 'mainnet', count }
    await assert.rejects(fetchRegistryCount('mainnet', signal), /Unexpected registry count/)
  }
})

test('a failed or aborted count fetch can be retried', async (t) => {
  const controller = new AbortController()
  let response = new Response(null, { status: 503 })
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    signal.throwIfAborted()
    return response
  })

  await assert.rejects(fetchRegistryCount('mainnet', controller.signal), /Registry count request failed/)
  controller.abort()
  await assert.rejects(fetchRegistryCount('mainnet', controller.signal), { name: 'AbortError' })
  response = Response.json({ networkId: 'mainnet', count: 12 })
  assert.equal(await fetchRegistryCount('mainnet', new AbortController().signal), 12)
})

test('view_code sends one credential-free JSON request to the selected public RPC', async (t) => {
  const payload = { result: { hash, block_height: 200 } }
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json(payload))

  for (const network of ['mainnet', 'testnet']) {
    const rpcUrl = `https://rpc.${network}.near.org`
    const accountId = `example.${network === 'mainnet' ? 'near' : 'testnet'}`
    const { signal } = new AbortController()
    const offset = fetchMock.mock.callCount()
    const data = await fetchViewCode(rpcUrl, accountId, signal)

    assert.deepEqual(readViewCode(data), { hash, blockHeight: 200 })
    assert.equal(fetchMock.mock.callCount(), offset + 1)
    const [url, init] = fetchMock.mock.calls[offset].arguments
    assert.equal(url, rpcUrl)
    assert.equal(init.method, 'POST')
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json' })
    assert.equal(init.credentials, 'omit')
    assert.equal(init.cache, 'no-store')
    assert.equal(init.redirect, 'error')
    assert.equal(init.signal, signal)
    assert.deepEqual(JSON.parse(init.body), {
      jsonrpc: '2.0',
      id: 'view-code',
      method: 'query',
      params: { request_type: 'view_code', account_id: accountId, finality: 'final' },
    })
  }
})

test('an HTTP failure sends no fallback request and a retry reads a fresh block', async (t) => {
  const rpcUrl = 'https://rpc.mainnet.near.org'
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  const { signal } = new AbortController()

  await assert.rejects(fetchViewCode(rpcUrl, 'example.near', signal), /RPC request failed/)
  assert.equal(fetchMock.mock.callCount(), 1)

  fetchMock.mock.mockImplementation(async () => Response.json({ result: { hash, block_height: 201 } }))
  const data = await fetchViewCode(rpcUrl, 'example.near', new AbortController().signal)
  assert.equal(fetchMock.mock.callCount(), 2)
  assert.equal(readViewCode(data).blockHeight, 201)
})

test('view_code uses the response block only when it is valid', () => {
  assert.deepEqual(readViewCode({ result: { hash, block_height: 200 } }), { hash, blockHeight: 200 })
  for (const block_height of [undefined, -1, 1.25, '200', Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(readViewCode({ result: { hash, block_height } }), { hash, blockHeight: undefined })
  }
  assert.throws(() => readViewCode({ result: { hash: 'malformed', block_height: 200 } }), { kind: 'unavailable' })
})

test('view_code preserves explicit account and code absence', () => {
  for (const name of ['UNKNOWN_ACCOUNT', 'NO_CONTRACT_CODE']) {
    const error = { cause: { name, info: { block_height: 200 } } }
    assert.deepEqual(readViewCode({ error }), { hash: null, blockHeight: 200 })
  }
  const data = 'Contract code for contract ID #example.near has never been observed on the node'
  assert.deepEqual(readViewCode({ error: { data } }), { hash: null, blockHeight: undefined })
})

test('an unavailable block or provider error is never reported as code absence', () => {
  const data = 'Block either has never been observed on the node or has been garbage collected'
  assert.throws(() => readViewCode({ error: { data } }), { kind: 'unavailable' })
  const error = { cause: { name: 'UNKNOWN_BLOCK' }, data }
  assert.throws(() => readViewCode({ error }), { kind: 'unavailable' })
  assert.throws(() => readViewCode({ error: { message: 'provider timeout' } }), { kind: 'unavailable' })
})
