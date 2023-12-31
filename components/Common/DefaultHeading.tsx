import { Heading } from '@chakra-ui/react'
import { ReactNode } from 'react'

export default function DefaultHeading(props: { children: ReactNode }) {
  return (
    <Heading
      fontSize={'lg'}
      textDecoration={'underline'}
      textUnderlineOffset={'6px'}
      textDecorationStyle={'dashed'}
      textDecorationColor={'gray.500'}
    >
      {props.children}
    </Heading>
  )
}
