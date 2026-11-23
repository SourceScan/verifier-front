import type { NetworkType } from '@/contexts/NetworkContext'
import axios from 'axios'
import { failure, readQueryResult } from './response'
import { getRpcUrl } from './rpc'

/**
 * Read-only NEAR RPC helpers that go through the /api/proxy-rpc allowlist.
 * Request bodies keep the exact shape the proxy accepts: jsonrpc 2.0,
 * method "query", finality "final" and an `X-Network` header.
 */

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
): Promise<unknown> {
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
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error
    throw failure('unavailable', 'RPC request failed')
  }
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
