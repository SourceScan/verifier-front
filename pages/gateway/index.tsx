import { useWallet } from '@/hooks/useWallet'
import { ArrowDownIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Flex,
  Heading,
  Icon,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { connect, keyStores } from 'near-api-js'
import { NextPageContext } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import GithubLink from '@/components/Common/GithubLink'
import PageHead from '@/components/Common/PageHead'
import PageRefresh from '@/components/Common/PageRefresh'
import DefaultButton from '@/components/Inputs/DefaultButton'
import ConnectButton from '@/components/Web3/ConnectButton'
import api from '@/utils/apis/api'

Gateway.getInitialProps = async (ctx: NextPageContext) => {
  const { query } = ctx

  return { query: query }
}

export default function Gateway(props: { query: any }) {
  const { wallet, account, publicKey } = useWallet()

  const toast = useToast()
  const router = useRouter()

  const [error, setError] = useState<boolean>(false)
  const [keyData, setKeyData] = useState<{
    accessToken: string
    lang: string
    accountId: string
    entryPoint: string
    github: {
      repo: string
      owner: string
      sha: string
    }
  } | null>(null)
  useEffect(() => {
    if (props.query?.transactionHashes) {
      toast({
        title: 'Transaction successful',
        description: 'Your contract has been deployed',
        status: 'success',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
      router.replace(router.pathname, undefined, { shallow: true })
    }
    if (props.query?.errorCode) {
      toast({
        title: 'Transaction error',
        description:
          props.query?.errorCode ||
          'There was an error deploying your contract',
        status: 'error',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
      router.replace(router.pathname, undefined, { shallow: true })
    }
    api
      .post('/api/gateway/decryptKey', {
        key: decodeURIComponent(props.query.key),
      })
      .then((res) => {
        setKeyData(res.data)
      })
      .catch((err) => {
        setError(true)
        toast({
          title: `Error ${err.response.status}`,
          description: err.message,
          status: 'error',
          duration: 9000,
          position: 'bottom',
          isClosable: true,
        })
      })
  }, [props.query])

  const [compiled, setCompiled] = useState<boolean>(false)
  const [compiling, setCompiling] = useState<boolean>(false)
  const [wasm, setWasm] = useState<string>('')
  const compile = async () => {
    if (!keyData) return

    if (account !== keyData?.accountId) {
      toast({
        title: 'Compilation error',
        description: 'You must use the same account that created the key',
        status: 'error',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
      return
    }

    setCompiling(true)
    api
      .post(
        `/api/compile/${keyData?.lang}`,
        {
          entryPoint: keyData?.entryPoint,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keyData?.accessToken}`,
          },
        }
      )
      .then((res) => {
        setWasm(res.data.wasmBase64)
        setCompiling(false)
        setCompiled(true)
        toast({
          title: 'Compilation successful',
          description: 'Your contract has been compiled',
          status: 'success',
          duration: 9000,
          position: 'bottom',
          isClosable: true,
        })
      })
      .catch((err) => {
        setCompiling(false)
        if (err.response && err.response.status === 401) {
          // Handling 401 Unauthorized error
          toast({
            title: 'Unauthorized',
            description: 'You are not authorized to perform this action',
            status: 'error',
            duration: 9000,
            position: 'bottom',
            isClosable: true,
          })
        } else {
          // Handling other types of errors
          toast({
            title: 'Compilation error',
            description:
              err.response?.data?.detail?.stderr ||
              'There was an error compiling your contract',
            status: 'error',
            duration: 9000,
            position: 'bottom',
            isClosable: true,
          })
        }
      })
  }

  const [deployed, setDeployed] = useState<boolean>(false)
  const [deploying, setDeploying] = useState<boolean>(false)
  const deployContract = async () => {
    setDeploying(true)

    const networkId = process.env.NEXT_PUBLIC_NETWORK || ''

    const keyStore = new keyStores.BrowserLocalStorageKeyStore()

    // configuration used to connect to NEAR
    const config = {
      networkId: networkId,
      keyStore: keyStore,
      nodeUrl: `https://rpc.${networkId}.near.org`,
      walletUrl: `https://wallet.${networkId}.near.org`,
      helperUrl: `https://helper.${networkId}.near.org`,
      explorerUrl: `https://explorer.${networkId}.near.org`,
    }

    // connect to NEAR! :)
    const nearConnection = await connect(config)
    // create a NEAR account object
    const senderAccount = await nearConnection.account(account as string)

    try {
      let tx = await senderAccount.deployContract(Buffer.from(wasm, 'base64'))

      console.log(tx)

      setDeployed(true)
      toast({
        title: 'Deployment successful',
        description: 'Your contract has been deployed',
        status: 'success',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
    } catch (err) {
      console.log(err)

      toast({
        title: 'Deployment error',
        description: 'There was an error deploying your contract',
        status: 'error',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
    }
    setDeploying(false)
  }

  const [verified, setVerified] = useState<boolean>(false)
  const [verifying, setVerifying] = useState<boolean>(false)
  const verifyContract = async () => {
    if (!keyData) return

    setVerifying(true)

    try {
      const response = await api.post(
        '/api/verify/rust',
        {
          entryPoint: keyData.entryPoint,
          networkId: process.env.NEXT_PUBLIC_NETWORK,
          accountId: keyData.accountId,
          uploadToIpfs: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keyData.accessToken}`,
          },
        }
      )

      if (response.data.message === 'Contract verified successfully') {
        setVerifying(false)
        toast({
          title: 'Verification successful',
          description: response.data.message,
          status: 'success',
          duration: 9000,
          position: 'bottom',
          isClosable: true,
        })
        setVerified(true)
      } else {
        throw new Error(response.data.message)
      }
    } catch (err: any) {
      setVerifying(false)
      toast({
        title: 'Verification error',
        description: err.message,
        status: 'error',
        duration: 9000,
        position: 'bottom',
        isClosable: true,
      })
    }
  }

  return (
    <>
      <PageHead title={'SourceScan'} />
      <PageRefresh>
        <Stack
          alignItems={'center'}
          maxW={'screen'}
          justifyContent={'center'}
          textAlign={'center'}
          p={4}
          spacing={12}
          pb={100}
        >
          {keyData ? (
            <>
              <ConnectButton />
              <Heading
                display={!wallet || !publicKey ? 'flex' : 'none'}
                fontSize={'md'}
              >
                {!wallet
                  ? 'Connect your wallet'
                  : !publicKey &&
                    'Add full access key for the deploying account'}
              </Heading>
              <Stack
                alignItems={'center'}
                justifyContent={'center'}
                textAlign={'center'}
                spacing={8}
                direction={{ md: 'row', base: 'column' }}
              >
                <GithubLink github={keyData?.github} />
                <Icon boxSize={'8'}>
                  <ArrowForwardIcon display={{ md: 'flex', base: 'none' }} />
                  <ArrowDownIcon display={{ md: 'none', base: 'flex' }} />
                </Icon>
                <Text fontWeight={'600'}>{keyData?.accountId}</Text>
                <Flex display={compiled ? 'none' : 'flex'}>
                  <DefaultButton
                    onClick={compile}
                    isDisabled={!keyData || !publicKey}
                    isLoading={compiling}
                  >
                    Compile
                  </DefaultButton>
                </Flex>
                <Flex display={compiled && !deployed ? 'flex' : 'none'}>
                  <DefaultButton
                    onClick={deployContract}
                    isDisabled={!keyData || !publicKey || !compiled}
                    isLoading={deploying}
                  >
                    Deploy
                  </DefaultButton>
                </Flex>
                <Flex display={deployed && !verified ? 'flex' : 'none'}>
                  <DefaultButton
                    onClick={verifyContract}
                    isDisabled={!keyData || !publicKey || !deployed}
                    isLoading={verifying}
                  >
                    Verify
                  </DefaultButton>
                </Flex>
              </Stack>
            </>
          ) : (
            <Spinner size={'xl'} />
          )}
        </Stack>
      </PageRefresh>
    </>
  )
}
