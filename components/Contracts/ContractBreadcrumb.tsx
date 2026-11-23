import { contractPath } from '@/utils/urls'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import NextLink from 'next/link'

const truncated = {
  display: 'inline-block',
  maxW: { base: '22ch', md: '48ch' },
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  verticalAlign: 'bottom',
} as const

/** Registry › account › Source navigation for contract pages. */
export default function ContractBreadcrumb(props: {
  accountId: string
  current: 'details' | 'source'
}) {
  const onDetails = props.current === 'details'
  return (
    <Breadcrumb fontSize="sm" color="muted" separator="/" spacing={2}>
      <BreadcrumbItem>
        <BreadcrumbLink as={NextLink} href="/">
          Verified contracts
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage={onDetails}>
        {onDetails ? (
          <BreadcrumbLink title={props.accountId} fontFamily="mono" {...truncated}>
            {props.accountId}
          </BreadcrumbLink>
        ) : (
          <BreadcrumbLink as={NextLink} href={contractPath(props.accountId)} title={props.accountId} fontFamily="mono" {...truncated}>
            {props.accountId}
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {!onDetails && (
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Source</BreadcrumbLink>
        </BreadcrumbItem>
      )}
    </Breadcrumb>
  )
}
