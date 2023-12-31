import { ExternalLinkIcon } from '@chakra-ui/icons'

export default function IconLink(props: { onClick: () => void }) {
  return (
    <ExternalLinkIcon
      cursor={'pointer'}
      zIndex={'20'}
      onClick={props.onClick}
    />
  )
}
