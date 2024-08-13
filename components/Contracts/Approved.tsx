import { rpc } from '@/utils/near/rpc'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Center, Spinner } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import axios from 'axios'
import DefaultTooltip from '../Common/DefaultTooltip'

export default function Approved(props: {
  accountId: string
  cid: string
  codeHash: string
}) {
  const [approved, setApproved] = useState<boolean | null>(null)
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    setApproved(null)
    setError(false)
    axios
      .post(rpc, {
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'view_code',
          finality: 'final',
          account_id: props.accountId,
        },
      })
      .then((res) => {
        setApproved(res.data.result.hash === props.codeHash)
      })
      .catch((err) => {
        console.log(err)
        setError(true)
      })
  }, [props.accountId, props.cid])

  return (
    <Center>
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
          <CloseIcon />
        ) : approved === null ? (
          <Spinner />
        ) : approved ? (
          <CheckIcon />
        ) : (
          <CloseIcon />
        )}
      </DefaultTooltip>
    </Center>
  )
}
