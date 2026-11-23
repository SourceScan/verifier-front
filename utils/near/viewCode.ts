/** Reads deployed code directly from the selected network's public RPC. */
export async function fetchViewCode(rpcUrl: string, accountId: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'view-code',
      method: 'query',
      params: { request_type: 'view_code', account_id: accountId, finality: 'final' },
    }),
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal,
  })
  if (!response.ok) throw new Error('RPC request failed')
  return response.json()
}
