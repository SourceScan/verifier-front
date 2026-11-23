type RpcErrorKind = 'unknown_account' | 'no_contract_code' | 'execution_error' | 'unavailable'

interface RpcFailure extends Error {
  kind: RpcErrorKind
  blockHeight?: number
}

interface QueryError {
  cause?: { name?: unknown; info?: { block_height?: unknown } }
  data?: unknown
  message?: unknown
}

interface QueryResult {
  error?: unknown
  result?: unknown
  hash?: unknown
  block_height?: unknown
}

export const failure = (kind: RpcErrorKind, message: string, blockHeight?: number): RpcFailure =>
  Object.assign(new Error(message), { kind, blockHeight })

export const isRpcFailure = (error: unknown): error is RpcFailure =>
  error instanceof Error && 'kind' in error

const readBlockHeight = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined

export const isNearCodeHash = (value: unknown): value is string =>
  typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)

const classify = (error: QueryError, legacyBlockHeight?: unknown): RpcFailure => {
  const cause = String(error?.cause?.name ?? '')
  const detail = String(error?.data ?? error?.message ?? '')
  const blockHeight = readBlockHeight(error?.cause?.info?.block_height ?? legacyBlockHeight)
  if (cause === 'UNKNOWN_ACCOUNT' || (!cause && /account \S+ does not exist while viewing/i.test(detail)))
    return failure('unknown_account', detail, blockHeight)
  if (cause === 'NO_CONTRACT_CODE' || (!cause && /Contract code for contract ID \S+ has never been observed on the node/i.test(detail)))
    return failure('no_contract_code', detail, blockHeight)
  if (cause === 'CONTRACT_EXECUTION_ERROR' || /wasm execution failed|Function call returned an error/i.test(detail))
    return failure('execution_error', detail)
  return failure('unavailable', detail || 'RPC request failed')
}

export function readQueryResult(data: unknown): QueryResult {
  const response = data as { error?: QueryError; result?: QueryResult } | null | undefined
  if (response?.error) throw classify(response.error)
  const result = response?.result
  if (!result || typeof result !== 'object') throw failure('unavailable', 'Empty RPC response')
  // Older nearcore versions can report query errors inside `result`.
  if (result.error) throw classify({ data: result.error }, result.block_height)
  return result
}

export function readViewCode(data: unknown): { hash: string | null; blockHeight?: number } {
  try {
    const result = readQueryResult(data)
    if (!isNearCodeHash(result.hash)) throw failure('unavailable', 'RPC response has no valid code hash')
    return { hash: result.hash, blockHeight: readBlockHeight(result.block_height) }
  } catch (error) {
    if (isRpcFailure(error) && (error.kind === 'no_contract_code' || error.kind === 'unknown_account'))
      return { hash: null, blockHeight: error.blockHeight }
    throw error
  }
}
