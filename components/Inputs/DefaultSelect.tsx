import { Select } from '@chakra-ui/react'

export default function DefaultSelect(props: any) {
  return (
    <Select
      {...props}
      border={'1px solid'}
      borderColor={'#748094'}
      rounded={'lg'}
    />
  )
}
