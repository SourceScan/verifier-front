import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import { NETWORKS } from '@/contexts/NetworkContext'

const registryReads = new Set(['get_contract', 'get_contracts', 'get_contracts_count', 'search'])

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the network from the request
    const network = req.headers['x-network'] ?? 'mainnet'
    if (network !== 'testnet' && network !== 'mainnet') {
      return res.status(400).json({ error: 'Invalid network' })
    }
    const body = req.body
    const params = body?.params
    const allowedCall =
      params?.request_type === 'call_function' &&
      (params.method_name === 'contract_source_metadata' ||
        (params.account_id === NETWORKS[network].contract &&
          registryReads.has(params.method_name)))
    if (
      body?.jsonrpc !== '2.0' ||
      body.method !== 'query' ||
      typeof params?.account_id !== 'string' ||
      (params.request_type !== 'view_code' && !allowedCall)
    ) {
      return res.status(400).json({ error: 'Unsupported RPC request' })
    }

    // Determine the RPC URL based on the network
    // Use QuickNode RPC endpoints from environment variables
    const rpcUrl =
      network === 'testnet'
        ? process.env.NEAR_RPC_TESTNET || 'https://rpc.testnet.near.org'
        : process.env.NEAR_RPC_MAINNET || 'https://rpc.mainnet.near.org'

    // Forward the request to the appropriate RPC endpoint
    const response = await axios.post(rpcUrl, body, { maxRedirects: 0 })

    // Return the response from the RPC endpoint
    return res.status(200).json(response.data)
  } catch {
    console.error('RPC provider request failed')
    return res
      .status(500)
      .json({ error: 'Failed to proxy request to RPC endpoint' })
  }
}
