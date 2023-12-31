import { truncateStringInMiddle } from '@/utils/truncate'
import { HStack, Text } from '@chakra-ui/react'

import IconLink from './IconLink'

export default function CidLink(props: { cid: string; isTruncated?: boolean }) {
  return (
    <HStack maxW={'200px'}>
      <Text>
        {props.isTruncated ? truncateStringInMiddle(props.cid, 8) : props.cid}
      </Text>
      <IconLink
        onClick={() =>
          window.open(
            `${process.env.NEXT_PUBLIC_API_HOST}/ipfs/${props.cid}`,
            '_blank'
          )
        }
      />
    </HStack>
  )
}
