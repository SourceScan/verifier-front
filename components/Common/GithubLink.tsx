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
  Text,
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Timeout for API requests (5 seconds)
    const requestTimeout = setTimeout(() => {
      if (loading) {
        console.log('GitHub API request timed out')
        setLoading(false)
        setError('Request timed out')
      }
    }, 5000)

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
        setLoading(false)
      })
      .catch((error) => {
        console.log('GitHub API error:', error)
        setError(
          error.response?.status === 404
            ? 'Repository not found'
            : error.message
        )
        setLoading(false)
      })

    return () => clearTimeout(requestTimeout)
  }, [props.github])

  // If there's an error, display error message only
  if (error) {
    return (
      <Text fontSize={'sm'} color="red.500">
        GitHub Error: {error}
      </Text>
    )
  }

  return (
    <Skeleton isLoaded={!loading}>
      {user ? (
        <>
          <HStack spacing={'2'} display={{ base: 'none', md: 'flex' }}>
            <Breadcrumb>
              <BreadcrumbItem>
                <GithubUser user={user} />
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
            <GithubUser user={user} />
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
        </>
      ) : (
        <Heading fontSize={'sm'} color="gray.500">
          Loading GitHub information...
        </Heading>
      )}
    </Skeleton>
  )
}
