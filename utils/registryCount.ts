import type { NetworkType } from '@/contexts/NetworkContext'

export async function fetchRegistryCount(network: NetworkType, signal: AbortSignal): Promise<number> {
  const host = process.env.NEXT_PUBLIC_API_HOST?.replace(/\/+$/, '') || 'https://api.sourcescan.dev'
  const response = await fetch(`${host}/api/contracts/count?networkId=${network}`, { signal, credentials: 'omit' })
  if (!response.ok) throw new Error('Registry count request failed')

  const data: { networkId?: unknown; count?: unknown } | null = await response.json()
  const raw = data?.count
  const count = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw
  if (data?.networkId !== network || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
    throw new Error('Unexpected registry count response')

  return count
}
