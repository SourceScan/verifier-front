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
    // Normalize parameters - handle arrays from query parsing
    const normalizeParam = (param: any) =>
      Array.isArray(param) ? param[0] : param

    // Extract CID parameter first
    const cid = normalizeParam(query.cid)

    // Extract and ensure path is correctly decoded if it exists
    let path = undefined
    if (query.path) {
      path = normalizeParam(query.path)

      // Remove CID from path if it's included
      // This handles cases where the full path with CID is passed
      if (path && cid && path.includes(cid)) {
        // Extract the part after the CID
        const cidIndex = path.indexOf(cid)
        if (cidIndex !== -1) {
          path = path.substring(cidIndex + cid.length)
          // Remove leading slash if present
          if (path.startsWith('/')) {
            path = path.substring(1)
          }
        }
      }
    }

    // Configure the request based on endpoint type
    let url = ''
    let requestParams: any = {}

    if (endpoint === 'structure') {
      // Structure endpoint - keep URL clean and pass path as a parameter
      url = `${apiHost}/api/ipfs/structure`
      requestParams = { cid }

      // Only include path if it exists
      if (path) {
        requestParams.path = path
      }
    } else if (endpoint === 'file') {
      // File endpoint - construct the direct IPFS URL
      // Format: /ipfs/{CID}/{path} as per the API structure
      if (path) {
        // Directly construct the IPFS URL with the path
        url = `${apiHost}/ipfs/${cid}/${path}`
        // No query parameters needed for direct IPFS file access
        requestParams = {}
      } else {
        // Fallback if only CID is provided
        url = `${apiHost}/ipfs/${cid}`
        requestParams = {}
      }
    } else {
      // For any other endpoints
      url = `${apiHost}/api/ipfs/${endpoint}`
      // Use normalized parameters
      const normalizedParams: any = {}
      Object.keys(query).forEach((key) => {
        normalizedParams[key] = normalizeParam(query[key])
      })
      requestParams = normalizedParams
    }

    // Make the request to the IPFS API with the constructed URL and parameters

    // Make the request to the IPFS API
    const response = await axios.get(url, {
      params: requestParams,
      headers: {
        'X-Network': network,
      },
    })

    // Process the response data (no logging needed)

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
    // Return a generic error message without logging
    return res
      .status(500)
      .json({ error: 'Failed to proxy request to IPFS endpoint' })
  }
}
