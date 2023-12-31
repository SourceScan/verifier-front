import { useToast } from '@chakra-ui/react'
import { useEffect } from 'react'

export default function FourOhFour() {
  const toast = useToast()
  useEffect(() => {
    toast({
      title: 'Error 404',
      description: 'Page not found',
      position: 'top',
      status: 'error',
      duration: 9000,
      isClosable: true,
    })
  }, [])
  return <></>
}
