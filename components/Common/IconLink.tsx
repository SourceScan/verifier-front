import { Icon, Link } from '@chakra-ui/react'
import { FiExternalLink } from 'react-icons/fi'

/** Keyboard-reachable external icon link with an accessible name. */
export default function IconLink(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      isExternal
      aria-label={`${props.label} (opens in new tab)`}
      title={props.label}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      minW="28px"
      minH="28px"
      rounded="md"
      color="muted"
      _hover={{ color: 'accent', bg: 'subtle' }}
    >
      <Icon as={FiExternalLink} aria-hidden />
    </Link>
  )
}
