import { GithubDto } from '@/Interfaces/github/github.dto'
import { truncateStringInMiddle } from '@/utils/truncate'
import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Breadcrumb,
  BreadcrumbItem,
  HStack,
  Heading,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useState } from 'react'

// Define User interface locally since it's only used here
interface User {
  name: string
  avatar: string
}

import GithubUser from '@/components/Inputs/Github/GithubUser'
import IconLink from './IconLink'

export default function GithubLink(props: { github: GithubDto }) {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    // Get user information from GitHub API
    axios
      .get(
        `https://api.github.com/repos/${props.github.owner}/${props.github.repo}`
      )
      .then((response) => {
        setUser({
          name: response.data.owner.login,
          avatar: response.data.owner.avatar_url,
        })
      })
      .catch((error) => {
        console.log(error)
      })
  }, [props.github])

  return (
    <Skeleton isLoaded={user !== null}>
      <HStack spacing={'2'} display={{ base: 'none', md: 'flex' }}>
        <Breadcrumb>
          <BreadcrumbItem>
            {user ? <GithubUser user={user} /> : null}
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Heading fontSize={'lg'}>{props.github.repo}</Heading>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Heading fontSize={'lg'}>
              {truncateStringInMiddle(props.github.sha, 12)}
            </Heading>
          </BreadcrumbItem>
        </Breadcrumb>
        <IconLink
          onClick={() => {
            window.open(
              `https://github.com/${props.github.owner}/${props.github.repo}/tree/${props.github.sha}`,
              '_blank'
            )
          }}
        />
      </HStack>
      <Stack
        spacing={'2'}
        align={'center'}
        justify={'center'}
        textAlign={'center'}
        display={{ base: 'flex', md: 'none' }}
      >
        {user ? <GithubUser user={user} /> : null}
        <ChevronDownIcon boxSize={'7'} />
        <Heading fontSize={'lg'}>{props.github.repo}</Heading>
        <ChevronDownIcon boxSize={'7'} />
        <Heading fontSize={'lg'}>
          {truncateStringInMiddle(props.github.sha, 12)}
        </Heading>
        <IconLink
          onClick={() => {
            window.open(
              `https://github.com/${props.github.owner}/${props.github.repo}/tree/${props.github.sha}`,
              '_blank'
            )
          }}
        />
      </Stack>
    </Skeleton>
  )
}
