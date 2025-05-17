import { Avatar, HStack, Heading } from '@chakra-ui/react'

// Define User interface locally
interface User {
  name: string
  avatar: string
}

export default function GithubUser(props: { user: User }) {
  return (
    <HStack spacing={'2'}>
      <Heading fontSize={'lg'}>{props.user?.name}</Heading>
      <Avatar src={props.user?.avatar} size={'sm'} />
    </HStack>
  )
}
