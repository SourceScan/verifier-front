import { GithubDto } from '@/Interfaces/github/github.dto'
import { githubTreeUrl } from '@/utils/urls'
import { Code, HStack, Icon, Link, Text, VisuallyHidden } from '@chakra-ui/react'
import { FiArrowUpRight, FiGithub } from 'react-icons/fi'

/**
 * Repository + pinned commit. Rendered from the parsed source snapshot only,
 * so it needs no extra GitHub API request (and cannot hit its rate limit).
 */
export default function GithubLink(props: { github: GithubDto }) {
  const { owner, repo, sha } = props.github
  return (
    <HStack spacing={2} flexWrap="wrap" rowGap={1}>
      <Link
        href={githubTreeUrl(props.github)}
        isExternal
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        fontWeight="600"
        wordBreak="break-all"
      >
        <Icon as={FiGithub} aria-hidden />
        {owner}/{repo}
        <Icon as={FiArrowUpRight} aria-hidden />
        <VisuallyHidden> (opens in new tab)</VisuallyHidden>
      </Link>
      <Text as="span" color="muted" fontSize="sm">
        at commit{' '}
        <Code fontSize="sm" title={sha} bg="subtle">
          {sha.slice(0, 12)}
        </Code>
      </Text>
    </HStack>
  )
}
