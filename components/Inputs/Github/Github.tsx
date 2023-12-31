import { Commit } from '@/Interfaces/github/commit'
import { GithubDto } from '@/Interfaces/github/github.dto'
import { Repository } from '@/Interfaces/github/repo'
import { User } from '@/Interfaces/github/user'
import { range } from '@/utils/range'
import { SearchIcon } from '@chakra-ui/icons'
import {
  Breadcrumb,
  BreadcrumbItem,
  Center,
  Flex,
  HStack,
  Heading,
  Input,
  RadioGroup,
  Spinner,
  Stack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

import DefaultSkeleton from '@/components/Common/DefaultSkeleton'
import DefaultTooltip from '@/components/Common/DefaultTooltip'
import IconLink from '@/components/Common/IconLink'
import api from '@/utils/apis/api'
import github from '@/utils/apis/github'
import DefaultButton from '../DefaultButton'
import DefaultRadio from '../DefaultRadio'
import DefaultSelect from '../DefaultSelect'
import GithubCommit from './GithubCommit'
import GithubUser from './GithubUser'

export default function Github(props: {
  handleUpload: (key: string, files: string[], github: GithubDto | null) => void
}) {
  const input = useRef<HTMLInputElement | null>(null)

  const toast = useToast()

  const [repo, setRepo] = useState<Repository | null>(null)
  const [repoLoading, setRepoLoading] = useState<boolean>(false)

  const handleInputBlur = () => {
    const element = input.current as HTMLInputElement
    element.scrollLeft = element.scrollWidth
  }

  const handleSearch = () => {
    setRepoLoading(true)

    const element = input.current as HTMLInputElement
    const repoUrl = element.value.toLocaleLowerCase()
    element.scrollLeft = element.scrollWidth

    const parsed: string[] = repoUrl
      ?.replace('https://github.com/', '')
      .split('/') as Array<string>

    github
      .get(`/repos/${parsed[0]}/${parsed[1]}`)
      .then((res) => {
        setUser({
          name: res.data.owner.login,
          avatar: res.data.owner.avatar_url,
        })
        setRepo({ name: res.data.name, url: res.data.html_url })
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'bottom',
        })
      })
      .finally(() => {
        setRepoLoading(false)
      })
  }

  const [branches, setBranches] = useState<string[] | null>(null)
  const [branchesLoading, setBranchesLoading] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    if (!user || !repo) return
    setBranchesLoading(true)

    github
      .get(`/repos/${user.name}/${repo.name}/branches`)
      .then((res) => {
        setBranches(
          res.data.map((e: any) => {
            return e.name
          })
        )
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'bottom',
        })
      })
      .finally(() => {
        setBranchesLoading(false)
      })
  }, [user, repo])

  const [selectedBranch, setSelectedBranch] = useState<string>('main')
  const [commitsLoading, setCommitsLoading] = useState<boolean>(false)
  const handleBranchChange = (e: any) => {
    setSelectedBranch(e.target.value)
  }

  const [selectedPage, setSelectedPage] = useState<number>(1)
  const [commits, setCommits] = useState<Commit[] | null>()
  useEffect(() => {
    if (!user || !repo) return
    setCommitsLoading(true)

    github
      .get(
        `/repos/${user?.name}/${repo?.name}/commits?per_page=10&page=${selectedPage}&sha=${selectedBranch}`
      )
      .then((res) => {
        setCommits(
          res.data.map((item: any) => {
            const commit = item.commit
            return {
              sha: item.sha,
              message: commit.message,
              date: new Date(commit.author.date),
              author: commit.author.name,
              url: item.html_url.replace('commit', 'tree'),
            }
          })
        )
      })
      .catch((err) => {
        if (selectedBranch === 'main') setSelectedBranch('master')
        else
          toast({
            title: 'Error',
            description: err.message,
            status: 'error',
            duration: 3000,
            isClosable: true,
            position: 'bottom',
          })
      })
      .finally(() => {
        setCommitsLoading(false)
      })
  }, [user, repo, selectedPage, selectedBranch])

  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null)
  const handleCommitSelect = (sha: string) => {
    setSelectedCommit(commits?.find((e) => e.sha === sha) as Commit)
  }

  const [importing, setimporting] = useState<boolean>(false)
  const [imported, setimported] = useState<boolean>(false)
  const handleimport = () => {
    if (!selectedCommit) return
    setimporting(true)

    api
      .post('/api/temp/github', { repo: repo?.url, sha: selectedCommit?.sha })
      .then((res) => {
        props.handleUpload(
          res.data.key,
          res.data.files,
          repo?.name && user?.name && selectedCommit?.sha
            ? {
                repo: repo?.name,
                owner: user?.name,
                sha: selectedCommit?.sha,
              }
            : null
        )
        setimported(true)
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: err.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'bottom',
        })
      })
      .finally(() => {
        setimporting(false)
      })
  }

  return (
    <Stack
      align={'center'}
      justify={'center'}
      spacing={'16'}
      display={imported ? 'none' : 'flex'}
      maxW={'screen'}
    >
      <HStack spacing={'1'}>
        <Input
          type={'text'}
          _placeholder={{
            color: useColorModeValue('gray.600', 'gray.100'),
          }}
          placeholder={'Repository URL'}
          borderColor={'gray.500'}
          borderWidth={'1px'}
          rounded={'lg'}
          borderStyle={'dashed'}
          ref={input}
          scrollBehavior={'smooth'}
          onBlur={handleInputBlur}
        />
        <DefaultButton onClick={handleSearch} borderStyle={'solid'}>
          {!repoLoading ? <SearchIcon /> : <Spinner />}
        </DefaultButton>
      </HStack>
      {user && repo ? (
        <DefaultSkeleton isLoaded={!repoLoading}>
          <HStack spacing={'2'}>
            <Breadcrumb>
              <BreadcrumbItem>
                <GithubUser user={user} />
              </BreadcrumbItem>
              <BreadcrumbItem>
                <Heading fontSize={'lg'}>{repo?.name}</Heading>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <Heading fontSize={'lg'}>{selectedCommit?.sha}</Heading>
              </BreadcrumbItem>
            </Breadcrumb>
            <IconLink
              onClick={() => {
                repo &&
                  window.open(
                    selectedCommit ? selectedCommit.url : repo?.url,
                    '_blank'
                  )
              }}
            />
            <DefaultButton
              isDisabled={!selectedCommit || importing}
              onClick={handleimport}
              borderStyle={'solid'}
            >
              {!importing ? 'Import' : <Spinner />}
            </DefaultButton>
          </HStack>
        </DefaultSkeleton>
      ) : null}
      {branches ? (
        <DefaultSkeleton isLoaded={!branchesLoading}>
          <DefaultTooltip label={'select branch'} placement={'top'}>
            <Flex>
              <DefaultSelect
                aria-label={'Select branch'}
                onChange={(e: any) => handleBranchChange(e)}
                value={selectedBranch}
              >
                {branches.map((branch: string, i: number) => (
                  <option key={i} value={branch}>
                    {branch}
                  </option>
                ))}
              </DefaultSelect>
            </Flex>
          </DefaultTooltip>
        </DefaultSkeleton>
      ) : null}
      {commits ? (
        <RadioGroup
          onChange={(sha) => handleCommitSelect(sha)}
          h={'100%'}
          w={'70%'}
        >
          <Center>
            <Stack
              borderColor={'gray.500'}
              borderWidth={'1px'}
              rounded={'lg'}
              borderStyle={'dashed'}
              spacing={'5'}
              p={'4'}
            >
              {commits.map((commit: Commit, i: number) => (
                <DefaultSkeleton key={i} isLoaded={!commitsLoading}>
                  <Flex
                    w={'full'}
                    borderBottom={'1px'}
                    borderStyle={'dashed'}
                    borderColor={'gray.500'}
                    pb={2}
                    align={'center'}
                    justify={'space-between'}
                  >
                    <DefaultRadio
                      value={commit.sha}
                      border={'1px solid'}
                      borderColor={'#748094'}
                    >
                      <GithubCommit commit={commit} />
                    </DefaultRadio>
                  </Flex>
                </DefaultSkeleton>
              ))}
            </Stack>
          </Center>
        </RadioGroup>
      ) : null}
      <HStack display={commits ? 'flex' : 'none'}>
        {range(
          selectedPage > 1 ? selectedPage - 1 : selectedPage,
          selectedPage + 1,
          1
        ).map((i) => (
          <DefaultButton key={i} onClick={() => setSelectedPage(i)}>
            {i}
          </DefaultButton>
        ))}
      </HStack>
    </Stack>
  )
}
