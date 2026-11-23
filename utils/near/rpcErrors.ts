/** NEAR RPC error classification. No imports, so tests run it under plain Node. */

export type RpcErrorKind =
  | 'unknown_account'
  | 'no_contract_code'
  | 'execution_error'
  | 'unavailable'

export interface RpcFailure extends Error {
  kind: RpcErrorKind
}

export const failure = (kind: RpcErrorKind, message: string): RpcFailure =>
  Object.assign(new Error(message), { kind })

export const isRpcFailure = (error: unknown): error is RpcFailure =>
  error instanceof Error && 'kind' in error

/**
 * A structured `cause` is authoritative: UNKNOWN_BLOCK (e.g. a pinned block
 * the node has not seen) or any other cause is never read as absence. Message
 * matching only serves errors without a cause (older nearcore).
 */
export const classify = (error: any): RpcFailure => {
  const cause = error?.cause?.name
  const legacy = cause === undefined || cause === null
  const detail = String(error?.data ?? error?.message ?? '')
  if (cause === 'UNKNOWN_ACCOUNT' || (legacy && /does not exist while viewing/.test(detail)))
    return failure('unknown_account', detail)
  if (
    cause === 'NO_CONTRACT_CODE' ||
    (legacy && /Contract code for contract ID .* has never been observed on the node/.test(detail))
  )
    return failure('no_contract_code', detail)
  if (cause === 'CONTRACT_EXECUTION_ERROR' || /wasm execution failed|Function call returned an error/i.test(detail))
    return failure('execution_error', detail)
  return failure('unavailable', detail || 'RPC request failed')
}
