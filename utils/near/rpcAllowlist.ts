/**
 * The only NEAR RPC requests /api/proxy-rpc forwards: the app's own read-only
 * queries, rebuilt from validated fields so nothing else (other methods or
 * request types, optimistic finality, block heights, extra fields) reaches
 * the provider. No imports, so tests run it under plain Node.
 */

const REGISTRY_READS = new Set(['get_contract', 'get_contracts', 'get_contracts_count', 'search'])
const BLOCK_HASH = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields => (value && typeof value === 'object' ? (value as Fields) : {})

export function allowedRpcBody(body: unknown, registryContract: string) {
  const { jsonrpc, method, params } = fields(body)
  const {
    request_type: requestType,
    account_id: accountId,
    method_name: methodName,
    args_base64: args,
    finality,
    block_id: blockId,
  } = fields(params)
  if (jsonrpc !== '2.0' || method !== 'query' || typeof accountId !== 'string') return null

  let request: Fields
  if (requestType === 'view_account' || requestType === 'view_code') {
    request = { request_type: requestType, account_id: accountId }
  } else if (
    requestType === 'call_function' &&
    typeof methodName === 'string' &&
    typeof args === 'string' &&
    (methodName === 'contract_source_metadata' ||
      (accountId === registryContract && REGISTRY_READS.has(methodName)))
  ) {
    request = { request_type: requestType, account_id: accountId, method_name: methodName, args_base64: args }
  } else {
    return null
  }

  // The latest final block; only view_code may instead name the block hash a
  // view_account answer came from, so both reads describe one chain state.
  let block: Fields
  if (finality === 'final' && blockId === undefined) {
    block = { finality }
  } else if (requestType === 'view_code' && finality === undefined && typeof blockId === 'string' && BLOCK_HASH.test(blockId)) {
    block = { block_id: blockId }
  } else {
    return null
  }

  return { jsonrpc: '2.0', id: 'dontcare', method: 'query', params: { ...request, ...block } }
}
