import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allowedRpcBody } from './rpcAllowlist.ts'

const REGISTRY = 'v2-verifier.sourcescan.near'
const BLOCK = '2' + 'c'.repeat(43)
const body = (params, top = {}) => ({ jsonrpc: '2.0', id: 'dontcare', method: 'query', params, ...top })
const allowed = (params, top) => allowedRpcBody(body(params, top), REGISTRY)

test("forwards the app's own reads, rebuilt from validated fields only", () => {
  const reads = [
    { request_type: 'view_account', account_id: 'app.near', finality: 'final' },
    { request_type: 'view_code', account_id: 'app.near', finality: 'final' },
    { request_type: 'view_code', account_id: 'app.near', block_id: BLOCK },
    { request_type: 'call_function', account_id: 'app.near', method_name: 'contract_source_metadata', args_base64: '', finality: 'final' },
    { request_type: 'call_function', account_id: REGISTRY, method_name: 'get_contract', args_base64: 'e30=', finality: 'final' },
    { request_type: 'call_function', account_id: REGISTRY, method_name: 'get_contracts', args_base64: 'e30=', finality: 'final' },
    { request_type: 'call_function', account_id: REGISTRY, method_name: 'get_contracts_count', args_base64: '', finality: 'final' },
    { request_type: 'call_function', account_id: REGISTRY, method_name: 'search', args_base64: 'e30=', finality: 'final' },
  ]
  for (const params of reads) assert.deepEqual(allowed(params), body(params), params.request_type)

  // Anything beyond those fields is dropped, not forwarded.
  assert.deepEqual(
    allowed({ request_type: 'view_account', account_id: 'app.near', finality: 'final', sync_checkpoint: 'genesis', extra: 1 }, { id: 7, extra: true }),
    body({ request_type: 'view_account', account_id: 'app.near', finality: 'final' })
  )
})

test('only the latest final block, or a block hash for view_code', () => {
  const rejected = {
    'optimistic view_account': { request_type: 'view_account', account_id: 'app.near', finality: 'optimistic' },
    'near-final view_code': { request_type: 'view_code', account_id: 'app.near', finality: 'near-final' },
    'no block reference': { request_type: 'view_account', account_id: 'app.near' },
    'finality and block id': { request_type: 'view_code', account_id: 'app.near', finality: 'final', block_id: BLOCK },
    'view_code at a height': { request_type: 'view_code', account_id: 'app.near', block_id: 123 },
    'view_code at a numeric string': { request_type: 'view_code', account_id: 'app.near', block_id: '123' },
    'view_code at a malformed hash': { request_type: 'view_code', account_id: 'app.near', block_id: 'not a hash' },
    'view_account at a block hash': { request_type: 'view_account', account_id: 'app.near', block_id: BLOCK },
    'call_function at a block hash': { request_type: 'call_function', account_id: 'app.near', method_name: 'contract_source_metadata', args_base64: '', block_id: BLOCK },
  }
  for (const [name, params] of Object.entries(rejected)) assert.equal(allowed(params), null, name)
})

test('rejects every other method, request type and call', () => {
  const final = { finality: 'final' }
  const rejected = {
    'block method': allowedRpcBody({ jsonrpc: '2.0', method: 'block', params: final }, REGISTRY),
    'tx method': allowedRpcBody({ jsonrpc: '2.0', method: 'tx', params: ['hash', 'app.near'] }, REGISTRY),
    'wrong jsonrpc': allowed({ request_type: 'view_account', account_id: 'app.near', ...final }, { jsonrpc: '1.0' }),
    view_state: allowed({ request_type: 'view_state', account_id: 'app.near', prefix_base64: '', ...final }),
    view_access_key_list: allowed({ request_type: 'view_access_key_list', account_id: 'app.near', ...final }),
    'arbitrary method': allowed({ request_type: 'call_function', account_id: 'app.near', method_name: 'ft_balance_of', args_base64: '', ...final }),
    'registry method on another contract': allowed({ request_type: 'call_function', account_id: 'app.near', method_name: 'get_contract', args_base64: '', ...final }),
    'call without args': allowed({ request_type: 'call_function', account_id: 'app.near', method_name: 'contract_source_metadata', ...final }),
    'missing account': allowed({ request_type: 'view_account', ...final }),
    'numeric account': allowed({ request_type: 'view_account', account_id: 1, ...final }),
    'no params': allowedRpcBody({ jsonrpc: '2.0', method: 'query' }, REGISTRY),
    'null body': allowedRpcBody(null, REGISTRY),
    'string body': allowedRpcBody('{"jsonrpc":"2.0"}', REGISTRY),
    'array body': allowedRpcBody([], REGISTRY),
  }
  for (const [name, result] of Object.entries(rejected)) assert.equal(result, null, name)
})
