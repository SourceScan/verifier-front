import { Commit } from '@/Interfaces/github/commit'
import { truncateStringInMiddle } from '@/utils/truncate'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Text } from '@chakra-ui/react'

export default function GithubCommit(props: { commit: Commit }) {
  const truncatedSha = truncateStringInMiddle(props.commit.sha, 12)

  return (
    <HStack spacing={'6'}>
      <Text>{props.commit.date.toLocaleDateString()}</Text>
      <Text fontWeight={'600'} fontSize={'s'} textAlign={'start'} w={'300px'}>
        "{props.commit.message}"
      </Text>
      <Text>{' by '}</Text>
      <Text>{props.commit.author}</Text>
      <Text fontWeight={'600'}>({truncatedSha})</Text>
      <ExternalLinkIcon
        zIndex={'20'}
        onClick={() => {
          window.open(props.commit.url, '_blank')
        }}
        cursor={'pointer'}
      />
    </HStack>
  )
}
