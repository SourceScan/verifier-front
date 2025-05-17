import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

// Cache TTL in seconds
const CACHE_TTL = {
  // Short cache for dynamic data
  default: 15, // 15 seconds
  // Longer cache for more static data
  view_code: 300, // 5 minutes
  // Very long cache for historical data
  block_query: 1800, // 30 minutes
}

// Determine cache TTL based on the request method
function getCacheTTL(body: any): number {
  if (body.method === 'query' && body.params?.request_type === 'view_code') {
    return CACHE_TTL.view_code
  }

  if (body.method === 'block') {
    return CACHE_TTL.block_query
  }

  // For contract approval status, use a longer cache
  if (
    body.method === 'query' &&
    body.params?.request_type === 'call_function'
  ) {
    return CACHE_TTL.view_code
  }

  return CACHE_TTL.default
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the network from the request
    const network = req.headers['x-network'] || 'mainnet'
    const body = req.body

    // Determine the RPC URL based on the network
    const rpcUrl =
      network === 'testnet'
        ? 'https://rpc.testnet.near.org'
        : 'https://rpc.mainnet.near.org'

    // Forward the request to the appropriate RPC endpoint
    const response = await axios.post(rpcUrl, body)

    // Set cache control headers based on the request type
    const ttl = getCacheTTL(body)
    res.setHeader(
      'Cache-Control',
      `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`
    )

    // Return the response from the RPC endpoint
    return res.status(200).json(response.data)
  } catch (error) {
    console.error('RPC proxy error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to proxy request to RPC endpoint' })
  }
}
