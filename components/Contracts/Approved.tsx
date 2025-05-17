import { useNetwork } from '@/contexts/NetworkContext'
import { useRpcUrl } from '@/utils/near/rpc'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Center, Spinner } from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useState } from 'react'
import DefaultTooltip from '../Common/DefaultTooltip'

// Global request queue to throttle API calls
const requestQueue: {
  accountId: string
  codeHash: string
  callback: Function
}[] = []
let isProcessingQueue = false

// Store network value to avoid direct localStorage access during rendering
let cachedNetwork = 'testnet'

// Update cached network value on client-side only
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const storedNetwork = localStorage.getItem('network')
    if (storedNetwork === 'testnet' || storedNetwork === 'mainnet') {
      cachedNetwork = storedNetwork
    }
  } catch (e) {
    console.warn('Failed to access localStorage:', e)
  }
}

// Process the queue with a delay between requests
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return

  isProcessingQueue = true

  const request = requestQueue.shift()
  if (request) {
    try {
      const { accountId, codeHash, callback } = request
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
            account_id: accountId,
          },
        },
        {
          headers: {
            'X-Network': cachedNetwork,
          },
        }
      )

      callback({
        success: true,
        approved: response.data.result.hash === codeHash,
      })
    } catch (error) {
      if (request) {
        request.callback({
          success: false,
          error,
        })
      }
    }
  }

  // Wait before processing the next request
  setTimeout(() => {
    isProcessingQueue = false
    processQueue()
  }, 300) // 300ms delay between requests
}

// Update cached network when localStorage changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (
      event.key === 'network' &&
      (event.newValue === 'testnet' || event.newValue === 'mainnet')
    ) {
      cachedNetwork = event.newValue
    }
  })
}

export default function Approved(props: {
  accountId: string
  cid: string
  codeHash: string
}) {
  const [approved, setApproved] = useState<boolean | null>(null)
  const [error, setError] = useState<boolean>(false)
  const { networkConfig } = useNetwork()
  const rpcUrl = useRpcUrl()

  useEffect(() => {
    if (!networkConfig) return

    setApproved(null)
    setError(false)

    // Add this request to the queue
    requestQueue.push({
      accountId: props.accountId,
      codeHash: props.codeHash,
      callback: (result: {
        success: boolean
        approved?: boolean
        error?: any
      }) => {
        if (result.success && result.approved !== undefined) {
          setApproved(result.approved)
        } else {
          console.log(result.error)
          setError(true)
        }
      },
    })

    // Start processing the queue if it's not already being processed
    if (!isProcessingQueue) {
      processQueue()
    }

    // Cleanup function to remove this request from the queue if component unmounts
    return () => {
      const index = requestQueue.findIndex(
        (req) =>
          req.accountId === props.accountId && req.codeHash === props.codeHash
      )
      if (index !== -1) {
        requestQueue.splice(index, 1)
      }
    }
  }, [props.accountId, props.cid, props.codeHash, networkConfig])

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
