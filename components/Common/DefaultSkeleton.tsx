import { bg, color } from '@/utils/theme'
import { Skeleton, useColorModeValue } from '@chakra-ui/react'
import { ReactNode } from 'react'

export default function DefaultSkeleton(props: {
  isLoaded: boolean
  children: ReactNode
}) {
  return (
    <Skeleton
      isLoaded={props.isLoaded}
      startColor={useColorModeValue(color.light, color.dark)}
      endColor={useColorModeValue(bg.light, bg.dark)}
      rounded={'lg'}
    >
      {props.children}
    </Skeleton>
  )
}
