import { bg } from '@/utils/theme'
import { Button, useColorModeValue } from '@chakra-ui/react'

export default function DefaultButton(props: any) {
  return (
    <Button
      {...props}
      border={`1px ${props.borderStyle || 'dashed'}`}
      borderColor={'#748094'}
      bg={useColorModeValue(bg.light, bg.dark)}
      rounded={'lg'}
    />
  )
}
