import { Heading, HStack } from '@chakra-ui/react'

export default function TableHeading(props: {
  label: string
  children: React.ReactNode
}) {
  return (
    <HStack justify={'space-between'} w={'full'}>
      <Heading
        fontSize={'sm'}
        textTransform={'uppercase'}
        textColor={'gray.500'}
      >
        {props.label}
      </Heading>
      {props.children}
    </HStack>
  )
}
