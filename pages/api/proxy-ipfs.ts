import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

// Cache TTL in seconds
const CACHE_TTL = {
  // Structure data can be cached longer
  structure: 300, // 5 minutes
  // File content can be cached even longer
  file: 600, // 10 minutes
  // Default cache time
  default: 60, // 1 minute
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Extract the endpoint from the query
  const { endpoint, ...query } = req.query
  const apiHost = process.env.NEXT_PUBLIC_API_HOST

  // Validate endpoint
  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Invalid endpoint specified' })
  }

  // Get the network from headers
  const network = req.headers['x-network'] || 'mainnet'

  try {
    // Construct the URL
    let url = `${apiHost}/api/ipfs/${endpoint}`

    // For direct IPFS content requests
    if (endpoint === 'file' && query.path) {
      url = `${apiHost}/ipfs/${query.path}`
    }

    // Make the request to the IPFS API
    const response = await axios.get(url, {
      params: endpoint === 'file' && query.path ? { cid: query.cid } : query,
      headers: {
        'X-Network': network,
      },
    })

    // Set cache control headers
    const ttl =
      endpoint === 'structure'
        ? CACHE_TTL.structure
        : endpoint === 'file'
        ? CACHE_TTL.file
        : CACHE_TTL.default

    res.setHeader(
      'Cache-Control',
      `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`
    )

    // Return the response from the IPFS API
    return res.status(200).json(response.data)
  } catch (error) {
    console.error('IPFS proxy error:', error)
    return res
      .status(500)
      .json({ error: 'Failed to proxy request to IPFS endpoint' })
  }
}
