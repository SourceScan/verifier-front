import type { NetworkType } from '@/contexts/NetworkContext'

const RPC_URLS: Record<NetworkType, string> = {
  mainnet: 'https://near.drpc.org',
  testnet: 'https://near-testnet.drpc.org',
}

export type RpcErrorKind = 'unknown_account' | 'no_contract_code' | 'method_not_found' | 'execution_error' | 'unavailable'

interface RpcFailure extends Error {
  kind: RpcErrorKind
  blockHeight?: number
}

interface QueryError {
  cause?: { name?: unknown; info?: { block_height?: unknown; vm_error?: unknown } }
  data?: unknown
  message?: unknown
}

interface QueryResult {
  error?: unknown
  result?: unknown
  hash?: unknown
  block_height?: unknown
}

const failure = (kind: RpcErrorKind, message: string, blockHeight?: number): RpcFailure =>
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
  // Structured errors carry the VM error separately; legacy ones only in `data`.
  const vmError = `${detail} ${String(error?.cause?.info?.vm_error ?? '')}`
  const blockHeight = readBlockHeight(error?.cause?.info?.block_height ?? legacyBlockHeight)
  if (cause === 'UNKNOWN_ACCOUNT' || (!cause && /account \S+ does not exist while viewing/i.test(detail)))
    return failure('unknown_account', detail, blockHeight)
  if (
    cause === 'NO_CONTRACT_CODE' ||
    (!cause && /Contract code for contract ID \S+ has never been observed on the node/i.test(detail)) ||
    /CompilationError\(CodeDoesNotExist\b/.test(vmError)
  )
    return failure('no_contract_code', detail, blockHeight)
  if (cause === 'CONTRACT_EXECUTION_ERROR' || /wasm execution failed|Function call returned an error/i.test(detail)) {
    // The contract has code but no such method: a fact about the code, not a failed call.
    if (/\bMethodNotFound\b/.test(vmError)) return failure('method_not_found', detail)
    return failure('execution_error', detail)
  }
  return failure('unavailable', detail || 'RPC request failed')
}

function readQueryResult(data: unknown): QueryResult {
  const response = data as { error?: QueryError; result?: QueryResult } | null | undefined
  if (response?.error) throw classify(response.error)
  const result = response?.result
  if (!result || typeof result !== 'object') throw failure('unavailable', 'Empty RPC response')
  // Older nearcore versions can report query errors inside `result`.
  if (result.error) throw classify({ data: result.error }, result.block_height)
  return result
}

/** Sends a read-only query to the selected network's public NEAR RPC. */
async function query(
  network: NetworkType,
  params: Record<string, unknown>,
  signal?: AbortSignal
): Promise<unknown> {
  try {
    const response = await fetch(RPC_URLS[network], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'query',
        method: 'query',
        params: { ...params, finality: 'final' },
      }),
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal,
    })
    if (response.ok) return await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
  }
  throw failure('unavailable', 'RPC request failed')
}

const encodeArgs = (args: unknown): string => {
  const utf8 = new TextEncoder().encode(JSON.stringify(args))
  let binary = ''
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i])
  return btoa(binary)
}

/** Calls a view method and JSON-decodes its return value. */
export async function viewFunction<T>(
  network: NetworkType,
  accountId: string,
  methodName: string,
  args?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> {
  const data = await query(
    network,
    {
      request_type: 'call_function',
      account_id: accountId,
      method_name: methodName,
      args_base64: args === undefined ? '' : encodeArgs(args),
    },
    signal
  )
  const result = readQueryResult(data)
  if (!Array.isArray(result.result))
    throw failure('unavailable', 'Unexpected view call result')
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(result.result)))
  } catch {
    throw failure('unavailable', 'View call returned invalid JSON')
  }
}

/** Reads the hash and block height for the deployed code, if present. */
export async function viewCode(
  network: NetworkType,
  accountId: string,
  signal: AbortSignal
): Promise<{ hash: string | null; blockHeight?: number }> {
  const data = await query(network, { request_type: 'view_code', account_id: accountId }, signal)
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
