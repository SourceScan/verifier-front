import { rpc } from '@/utils/near/rpc'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Center, Spinner } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import api from '@/utils/apis/api'
import axios from 'axios'
import DefaultTooltip from '../Common/DefaultTooltip'

export default function Approved(props: {
  accountId: string
  cid: string
  deploy_tx: string
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
        axios
          .get(
            `${process.env.NEXT_PUBLIC_API_HOST}/ipfs/${props.cid}/wasm_code_base64`
          )
          .then((res2) => {
            if (res2.data !== res.data.result.code_base64) {
              setApproved(false)
              return
            } else {
              api
                .post('/api/ipfs/getTxHash', { cid: props.cid })
                .then((res) => {
                  setApproved(res.data.tx_hash === props.deploy_tx)
                })
                .catch((err) => {
                  console.log(err)
                  setError(true)
                })
            }
          })
          .catch((err) => {
            console.log(err)
            setError(true)
          })
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
