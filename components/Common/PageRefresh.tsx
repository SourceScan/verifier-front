import { TriangleDownIcon } from '@chakra-ui/icons'
import {
  Center,
  Flex,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import PullToRefresh from 'react-simple-pull-to-refresh'

export default function PageRefresh(props: { children: React.ReactNode }) {
  const router = useRouter()
  const handleRefresh = async () => {
    router.refresh()
  }

  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (document.readyState === 'complete') {
      setLoaded(true)
    } else {
      const handleLoad = () => {
        setLoaded(true)
      }
      window.addEventListener('load', handleLoad)
      return () => {
        window.removeEventListener('load', handleLoad)
      }
    }
  }, [])

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshingContent={
        <Flex
          alignItems={'center'}
          justifyContent={'center'}
          mt={16}
          display={loaded ? 'flex' : 'none'}
        >
          <Center
            w={8}
            bg={useColorModeValue('blackAlpha.900', 'whiteAlpha.900')}
            rounded={'full'}
            p={2}
          >
            <Spinner
              size={'sm'}
              color={useColorModeValue('whiteAlpha.900', 'blackAlpha.900')}
            />
          </Center>
        </Flex>
      }
      pullDownThreshold={80}
      pullingContent={
        <Stack
          spacing={5}
          alignItems={'center'}
          justifyContent={'center'}
          mt={16}
          display={loaded ? 'flex' : 'none'}
        >
          <Center
            w={8}
            bg={useColorModeValue('blackAlpha.900', 'whiteAlpha.900')}
            rounded={'full'}
            p={2}
          >
            <TriangleDownIcon
              color={useColorModeValue('whiteAlpha.900', 'blackAlpha.900')}
            />
          </Center>
          <Text color={useColorModeValue('blackAlpha.900', 'whiteAlpha.900')}>
            Pull to refresh
          </Text>
        </Stack>
      }
    >
      {loaded ? (
        <>
          <Center pt={20} pb={10} mb={18} />
          {props.children}
        </>
      ) : (
        <></>
      )}
    </PullToRefresh>
  )
}
