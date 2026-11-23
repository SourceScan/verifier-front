import type { NetworkType } from '@/contexts/NetworkContext'
import axios from 'axios'
import { getRpcUrl } from './rpc'

/**
 * Read-only NEAR RPC helpers that go through the /api/proxy-rpc allowlist.
 * Request bodies keep the exact shape the proxy accepts: jsonrpc 2.0,
 * method "query", finality "final" and an `X-Network` header.
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
  signal?: AbortSignal
) {
  let data: any
  try {
    const response = await axios.post(
      getRpcUrl(network),
      {
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: { ...params, finality: 'final' },
      },
      { headers: { 'X-Network': network }, signal }
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
    signal
  )
  if (!Array.isArray(result.result))
    throw failure('unavailable', 'Unexpected view call result')
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(result.result)))
  } catch {
    throw failure('unavailable', 'View call returned invalid JSON')
  }
}

/** Returns the hash of the code currently deployed on `accountId`. */
export async function viewCodeHash(
  network: NetworkType,
  accountId: string
): Promise<string> {
  const result = await query(network, {
    request_type: 'view_code',
    account_id: accountId,
  })
  if (typeof result.hash !== 'string' || !result.hash)
    throw failure('unavailable', 'RPC response has no code hash')
  return result.hash
}
