import { useNetwork } from '@/contexts/NetworkContext'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Center, Spinner } from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useState } from 'react'
import DefaultTooltip from '../Common/DefaultTooltip'

// Simple in-memory cache for approval status
const approvalCache: Record<string, { approved: boolean; timestamp: number }> =
  {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export default function Approved(props: {
  accountId: string
  cid: string
  codeHash: string
  key?: string // Component key for remounting
}) {
  const [approved, setApproved] = useState<boolean | null>(null)
  const [error, setError] = useState<boolean>(false)
  const { networkConfig } = useNetwork()

  // Fetch approval status
  useEffect(() => {
    if (!networkConfig) return

    // Create a cache key
    const cacheKey = `${networkConfig.name.toLowerCase()}:${props.accountId}:${
      props.codeHash
    }`

    // Check cache first
    const cachedResult = approvalCache[cacheKey]
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      setApproved(cachedResult.approved)
      return
    }

    // If not in cache, fetch from API
    const fetchApprovalStatus = async () => {
      try {
        const rpcUrl = '/api/proxy-rpc'
        const response = await axios.post(
          rpcUrl,
          {
            jsonrpc: '2.0',
            id: 'dontcare',
            method: 'query',
            params: {
              request_type: 'view_code',
              finality: 'final',
              account_id: props.accountId,
            },
          },
          {
            headers: {
              'X-Network': networkConfig.name.toLowerCase(),
            },
          }
        )

        // Check if response has the expected structure
        if (
          response.data &&
          response.data.result &&
          response.data.result.hash
        ) {
          const isApproved = response.data.result.hash === props.codeHash

          // Update cache
          approvalCache[cacheKey] = {
            approved: isApproved,
            timestamp: Date.now(),
          }

          setApproved(isApproved)
        } else {
          console.error('Invalid response format:', response.data)
          setError(true)
        }
      } catch (error) {
        console.error('Error fetching approval status:', error)
        setError(true)
      }
    }

    fetchApprovalStatus()
  }, [props.accountId, props.codeHash, networkConfig])

  return (
    <Center h="24px" w="24px">
      <DefaultTooltip
        label={
          error
            ? 'Error'
            : approved === null
            ? 'Loading...'
            : approved
            ? 'Approved'
            : 'Not Approved'
        }
        placement={'top'}
      >
        {error ? (
          <CloseIcon boxSize="16px" />
        ) : approved === null ? (
          <Spinner size="sm" thickness="2px" speed="0.65s" />
        ) : approved ? (
          <CheckIcon boxSize="16px" />
        ) : (
          <CloseIcon boxSize="16px" />
        )}
      </DefaultTooltip>
    </Center>
  )
}
