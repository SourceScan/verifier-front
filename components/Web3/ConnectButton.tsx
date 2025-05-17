import { HStack, useToast } from '@chakra-ui/react'
import DefaultButton from '../Inputs/DefaultButton'

export default function ConnectButton() {
  const toast = useToast()

  // Wallet functionality has been removed
  const loading = false

  const handleConnect = async () => {
    toast({
      title: 'Wallet functionality removed',
      description: 'Wallet connection has been disabled in this version',
      status: 'info',
      duration: 5000,
      position: 'bottom',
      isClosable: true,
    })
  }

  return (
    <>
      <HStack display={!loading ? 'flex' : 'none'}>
        <DefaultButton borderStyle={'solid'} onClick={handleConnect}>
          Connect
        </DefaultButton>
      </HStack>
    </>
  )
}
