import { Flex, Input, Text } from '@chakra-ui/react'
import { RefObject, useEffect, useRef } from 'react'

export default function ButtonInput(props: {
  handleChange: (_ref: RefObject<HTMLInputElement>) => void
  children: string
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current !== null) {
      ref.current.setAttribute('directory', '')
      ref.current.setAttribute('webkitdirectory', '')
    }
  }, [ref])

  return (
    <Flex
      borderWidth={'1.5px'}
      borderStyle={'dotted'}
      borderColor={'gray.500'}
      rounded={'lg'}
      maxW={'240px'}
      maxH={'40px'}
      align={'center'}
      justify={'center'}
    >
      <Text position={'absolute'}>{props.children}</Text>
      <Input
        ref={ref}
        type={'file'}
        onChange={() => props.handleChange(ref)}
        opacity={0}
      />
    </Flex>
  )
}
