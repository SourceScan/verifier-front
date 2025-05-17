import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

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

    // Determine the RPC URL based on the network
    const rpcUrl =
      network === 'testnet'
        ? 'https://rpc.testnet.near.org'
        : 'https://rpc.mainnet.near.org'

    // Forward the request to the appropriate RPC endpoint
    const response = await axios.post(rpcUrl, req.body)

    // Return the response from the RPC endpoint
    return res.status(200).json(response.data)
  } catch (error) {
    console.error('RPC proxy error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to proxy request to RPC endpoint' })
  }
}
