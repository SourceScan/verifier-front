import { Icon, Link, LinkProps, VisuallyHidden } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'

/** Text link that opens in a new tab, with a visible ↗ and an announced hint. */
export default function ExternalTextLink(props: { href: string; children: ReactNode; srSuffix?: string } & LinkProps) {
  const { href, children, srSuffix, ...rest } = props
  return (
    <Link href={href} isExternal display="inline-flex" alignItems="center" gap={0.5} {...rest}>
      {children}
      <Icon as={FiArrowUpRight} aria-hidden boxSize="1em" flexShrink={0} />
      <VisuallyHidden>
        {srSuffix ? ` ${srSuffix}` : ''} (opens in new tab)
      </VisuallyHidden>
    </Link>
  )
}
