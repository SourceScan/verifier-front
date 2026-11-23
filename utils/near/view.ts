import type { NetworkType } from '@/contexts/NetworkContext'
import axios from 'axios'
import { readDeployedCodeHash } from './deployedCode'
import { getRpcUrl } from './rpc'
import { classify, failure, isRpcFailure } from './rpcErrors'

/**
 * Read-only NEAR RPC helpers that go through the /api/proxy-rpc allowlist.
 * Request bodies keep the exact shape the proxy accepts: jsonrpc 2.0,
 * method "query", an `X-Network` header and finality "final" (only the
 * view_code fallback instead names the block hash of a view_account answer).
 */

export type RpcErrorKind =
  | 'unknown_account'
  | 'no_contract_code'
  | 'execution_error'
  | 'unavailable'

export interface RpcFailure extends Error {
  kind: RpcErrorKind
}

const failure = (kind: RpcErrorKind, message: string): RpcFailure =>
  Object.assign(new Error(message), { kind })

export const isRpcFailure = (error: unknown): error is RpcFailure =>
  error instanceof Error && 'kind' in error

const classify = (error: any): RpcFailure => {
  const cause = String(error?.cause?.name ?? '')
  const detail = String(error?.data ?? error?.message ?? '')
  if (cause === 'UNKNOWN_ACCOUNT' || /does not exist while viewing/.test(detail))
    return failure('unknown_account', detail)
  if (
    cause === 'NO_CONTRACT_CODE' ||
    /has never been observed on the node/.test(detail)
  )
    return failure('no_contract_code', detail)
  if (cause === 'CONTRACT_EXECUTION_ERROR' || /wasm execution failed|Function call returned an error/i.test(detail))
    return failure('execution_error', detail)
  return failure('unavailable', detail || 'RPC request failed')
}

const encodeArgs = (args: unknown): string => {
  const utf8 = new TextEncoder().encode(JSON.stringify(args))
  let binary = ''
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i])
  return btoa(binary)
}

async function query(
  network: NetworkType,
  params: Record<string, unknown>,
  options: { signal?: AbortSignal; blockHash?: string } = {}
) {
  // The latest final block (never optimistic), or the exact block an earlier answer came from.
  const block = options.blockHash ? { block_id: options.blockHash } : { finality: 'final' }
  let data: any
  try {
    const response = await axios.post(
      getRpcUrl(network),
      {
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: { ...params, ...block },
      },
      { headers: { 'X-Network': network }, signal: options.signal }
    )
    data = response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error
    throw failure('unavailable', 'RPC request failed')
  }
  if (data?.error) throw classify(data.error)
  // Older nearcore versions report call_function panics inside `result`.
  if (data?.result?.error) throw classify({ data: data.result.error })
  if (!data?.result) throw failure('unavailable', 'Empty RPC response')
  return data.result
}

/** Calls a view method and JSON-decodes its return value. */
export async function viewFunction<T>(
  network: NetworkType,
  accountId: string,
  methodName: string,
  args?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> {
  const result = await query(
    network,
    {
      request_type: 'call_function',
      account_id: accountId,
      method_name: methodName,
      args_base64: args === undefined ? '' : encodeArgs(args),
    },
    { signal }
  )
  if (!Array.isArray(result.result))
    throw failure('unavailable', 'Unexpected view call result')
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(result.result)))
  } catch {
    throw failure('unavailable', 'View call returned invalid JSON')
  }
}

/**
 * Hash of the code deployed on `accountId` at the latest final block, or null
 * when the account has no code or does not exist. Read from `view_account`;
 * `view_code` (the full WASM) only when that answer does not name the hash.
 */
export async function viewDeployedCodeHash(
  network: NetworkType,
  accountId: string
): Promise<string | null> {
  try {
    return await readDeployedCodeHash((params, blockHash) => query(network, params, { blockHash }), accountId)
  } catch (error) {
    if (isRpcFailure(error) && (error.kind === 'no_contract_code' || error.kind === 'unknown_account'))
      return null
    throw error
  }
}
