import '@near-wallet-selector/modal-ui/styles.css'

import { useWallet } from '@/hooks/useWallet'
import { SmallCloseIcon } from '@chakra-ui/icons'
import { Flex, HStack, Text, useToast } from '@chakra-ui/react'
import { setupModal } from '@near-wallet-selector/modal-ui'
import { KeyPair } from 'near-api-js'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import KeysAlertDialog from '../Alerts/KeysAlertDialog'
import DefaultTooltip from '../Common/DefaultTooltip'
import DefaultButton from '../Inputs/DefaultButton'

export default function ConnectButton() {
  const router = useRouter()
  const toast = useToast()

  const { selector, account, wallet, publicKey, loading } = useWallet()

  const handleConnect = async () => {
    if (!selector) return

    const modal = setupModal(selector, {
      contractId: '',
    })
    modal.show()
  }

  const handleAddKey = async (accessKey: KeyPair | null) => {
    if (!account || !accessKey) return

    localStorage.setItem('pending_key', accessKey.toString())

    try {
      const tx = await wallet.signAndSendTransactions({
        transactions: [
          {
            receiverId: account as string,
            actions: [
              {
                type: 'AddKey',
                params: {
                  publicKey: accessKey.getPublicKey().toString(),
                  accessKey: {
                    permission: 'FullAccess',
                  },
                },
              },
            ],
          },
        ],
        callbackUrl: `${
          process.env.NEXT_PUBLIC_HOST
        }/keyAdded?redirectUri=${encodeURIComponent(router.asPath)}`,
      })
    } catch (e) {
      console.log(e)
      toast({
        title: 'Error adding new full access key',
        description: 'You are missing a full access key',
        status: 'error',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
    }
  }

  const handleDeleteKey = async () => {
    const tx = await wallet.signAndSendTransactions({
      transactions: [
        {
          receiverId: account as string,
          actions: [
            {
              type: 'DeleteKey',
              params: { publicKey: publicKey },
            },
          ],
        },
      ],
      callbackUrl: `${
        process.env.NEXT_PUBLIC_HOST
      }/signedOut?redirectUri=${encodeURIComponent(router.asPath)}`,
    })
  }

  const handleAccountChange = () => {
    wallet.signOut()
    router.reload()
  }

  const [action, setAction] = useState<string | null>(null)
  const [accessKey, setAccessKey] = useState<KeyPair | null>(null)
  const [dialogResult, setDialogResult] = useState<boolean | null>(null)
  useEffect(() => {
    if (dialogResult === true) {
      action === 'add' ? handleAddKey(accessKey) : handleDeleteKey()
    } else if (dialogResult === false) {
      setDialogResult(null)
      setAction(null)
      setAccessKey(null)
    }
  }, [dialogResult, accessKey])

  return (
    <>
      <HStack display={!loading ? 'flex' : 'none'}>
        <Text
          border={'1px solid'}
          borderColor={'#748094'}
          rounded={'lg'}
          p={'2'}
          display={account ? 'flex' : 'none'}
        >
          {account}
        </Text>
        <Flex display={account ? 'flex' : 'none'}>
          <DefaultTooltip label={'Change Account'} placement={'bottom'}>
            <Flex>
              <DefaultButton onClick={handleAccountChange}>
                <SmallCloseIcon />
              </DefaultButton>
            </Flex>
          </DefaultTooltip>
        </Flex>
        <DefaultButton
          borderStyle={'solid'}
          onClick={
            !account
              ? handleConnect
              : !publicKey
              ? () => {
                  setAction('add')
                  setAccessKey(KeyPair.fromRandom('ed25519'))
                }
              : () => {
                  setAction('delete')
                }
          }
        >
          {!account ? 'Connect' : !publicKey ? 'Add Key' : 'Delete Key'}
        </DefaultButton>
      </HStack>
      {action && (
        <KeysAlertDialog
          open={action !== null}
          action={action}
          publicKey={
            action === 'add'
              ? accessKey?.getPublicKey().toString() || ''
              : publicKey || ''
          }
          dialogResult={(result: boolean) => {
            console.log(result)
            setDialogResult(result)
          }}
        />
      )}
    </>
  )
}
