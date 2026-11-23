const assert = require('node:assert/strict')
const { test } = require('node:test')
const { verificationLabel } = require('../utils/contracts.ts')
const { viewCode, viewFunction } = require('../utils/near/view.ts')
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

function assertRpcRequest(fetchMock, network, signal, params) {
  const endpoints = {
    mainnet: 'https://near.drpc.org',
    testnet: 'https://near-testnet.drpc.org',
  }
  assert.equal(fetchMock.mock.callCount(), 1)
  const [url, init] = fetchMock.mock.calls[0].arguments
  assert.equal(url, endpoints[network])
  assert.equal(init.method, 'POST')
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json' })
  assert.equal(init.credentials, 'omit')
  assert.equal(init.cache, 'no-store')
  assert.equal(init.redirect, 'error')
  assert.equal(init.signal, signal)
  assert.deepEqual(JSON.parse(init.body), {
    jsonrpc: '2.0',
    id: 'query',
    method: 'query',
    params: { ...params, finality: 'final' },
  })
  fetchMock.mock.resetCalls()
}

function viewFunctionResult(value) {
  return { result: { result: Array.from(Buffer.from(JSON.stringify(value), 'utf8')) } }
}

test('registry lists, search, records, and source metadata query the public RPC on both networks', async (t) => {
  let payload
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json(payload))
  const { signal } = new AbortController()

  for (const [network, suffix] of [['mainnet', 'near'], ['testnet', 'testnet']]) {
    const registry = `v2-verifier.sourcescan.${suffix}`
    const accountId = `example.${suffix}`
    const page = { from_index: 10, limit: 10 }
    const requests = [
      ['get_contracts', registry, page, [[{ account_id: accountId }], 2]],
      ['search', registry, { ...page, key: 'café' }, [[], 0]],
      ['get_contract', registry, { account_id: accountId }, null],
      ['contract_source_metadata', accountId, undefined, { version: 'café' }],
    ]

    for (const [method, target, args, value] of requests) {
      payload = viewFunctionResult(value)
      assert.deepEqual(await viewFunction(network, target, method, args, signal), value)
      assertRpcRequest(fetchMock, network, signal, {
        request_type: 'call_function',
        account_id: target,
        method_name: method,
        args_base64: args === undefined ? '' : Buffer.from(JSON.stringify(args), 'utf8').toString('base64'),
      })
    }
  }
})

test('view_code sends one credential-free JSON request to the selected public RPC', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ result: { hash, block_height: 200 } }))
  const { signal } = new AbortController()

  for (const network of ['mainnet', 'testnet']) {
    const accountId = `example.${network === 'mainnet' ? 'near' : 'testnet'}`
    assert.deepEqual(await viewCode(network, accountId, signal), { hash, blockHeight: 200 })
    assertRpcRequest(fetchMock, network, signal, { request_type: 'view_code', account_id: accountId })
  }
})

test('an HTTP failure sends no fallback request and a retry reads a fresh block', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  const { signal } = new AbortController()

  await assert.rejects(viewCode('mainnet', 'example.near', signal), { kind: 'unavailable' })
  assert.equal(fetchMock.mock.callCount(), 1)

  fetchMock.mock.mockImplementation(async () => Response.json({ result: { hash, block_height: 201 } }))
  assert.deepEqual(await viewCode('mainnet', 'example.near', new AbortController().signal), { hash, blockHeight: 201 })
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('fetch and JSON body failures remain unavailable', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  const read = () => viewFunction('mainnet', 'example.near', 'contract_source_metadata')

  await assert.rejects(read(), { kind: 'unavailable' })
  fetchMock.mock.mockImplementation(async () => new Response('Invalid JSON'))
  await assert.rejects(read(), { kind: 'unavailable' })
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('an aborted view call preserves the abort reason and can be retried', async (t) => {
  const controller = new AbortController()
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    assert.equal(signal, controller.signal)
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  })

  const read = (signal) => viewFunction('testnet', 'example.testnet', 'contract_source_metadata', undefined, signal)
  const pending = read(controller.signal)
  controller.abort()
  await assert.rejects(pending, (error) => error === controller.signal.reason)
  assert.equal(fetchMock.mock.callCount(), 1)

  const metadata = { version: '1.0.0' }
  fetchMock.mock.mockImplementation(async () => Response.json(viewFunctionResult(metadata)))
  assert.deepEqual(await read(new AbortController().signal), metadata)
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('view calls preserve query errors and reject malformed results', async (t) => {
  let payload
  t.mock.method(globalThis, 'fetch', async () => Response.json(payload))
  const read = () => viewFunction('testnet', 'example.testnet', 'contract_source_metadata')

  payload = { error: { cause: { name: 'UNKNOWN_ACCOUNT' } } }
  await assert.rejects(read(), { kind: 'unknown_account' })
  payload = { result: { error: 'Function call returned an error: MethodNotFound' } }
  await assert.rejects(read(), { kind: 'execution_error' })
  payload = { error: { cause: { name: 'UNKNOWN_BLOCK' } } }
  await assert.rejects(read(), { kind: 'unavailable' })
  payload = { result: {} }
  await assert.rejects(read(), { kind: 'unavailable', message: 'Unexpected view call result' })
  payload = { result: { result: [] } }
  await assert.rejects(read(), { kind: 'unavailable', message: 'View call returned invalid JSON' })
})

test('view_code uses the response block only when it is valid', async (t) => {
  let result
  t.mock.method(globalThis, 'fetch', async () => Response.json({ result }))
  const read = () => viewCode('mainnet', 'example.near', new AbortController().signal)

  for (const block_height of [undefined, -1, 1.25, '200', Number.MAX_SAFE_INTEGER + 1]) {
    result = { hash, block_height }
    assert.deepEqual(await read(), { hash, blockHeight: undefined })
  }
  result = { hash: 'malformed', block_height: 200 }
  await assert.rejects(read(), { kind: 'unavailable' })
})

test('view_code preserves explicit account and code absence', async (t) => {
  let payload
  t.mock.method(globalThis, 'fetch', async () => Response.json(payload))
  const read = () => viewCode('mainnet', 'example.near', new AbortController().signal)

  for (const name of ['UNKNOWN_ACCOUNT', 'NO_CONTRACT_CODE']) {
    payload = { error: { cause: { name, info: { block_height: 200 } } } }
    assert.deepEqual(await read(), { hash: null, blockHeight: 200 })
  }
  const error = 'Contract code for contract ID #example.near has never been observed on the node'
  payload = { result: { error, block_height: 201 } }
  assert.deepEqual(await read(), { hash: null, blockHeight: 201 })
})

test('an unavailable block or provider error is never reported as code absence', async (t) => {
  let error
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error }))
  const read = () => viewCode('mainnet', 'example.near', new AbortController().signal)

  const data = 'Block either has never been observed on the node or has been garbage collected'
  error = { data }
  await assert.rejects(read(), { kind: 'unavailable' })
  error = { cause: { name: 'UNKNOWN_BLOCK' }, data }
  await assert.rejects(read(), { kind: 'unavailable' })
  error = { message: 'provider timeout' }
  await assert.rejects(read(), { kind: 'unavailable' })
})
