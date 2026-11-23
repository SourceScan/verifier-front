import ExternalTextLink from '@/components/Common/ExternalTextLink'
import { truncateStringInMiddle } from '@/utils/truncate'
import { ipfsUrl } from '@/utils/urls'

export default function CidLink(props: { cid: string; isTruncated?: boolean }) {
  return (
    <ExternalTextLink href={ipfsUrl(props.cid)} srSuffix={`IPFS snapshot ${props.cid}`} title={props.cid} fontFamily="mono" fontSize="13px" wordBreak="break-all" alignItems="flex-start">
      {props.isTruncated ? truncateStringInMiddle(props.cid, 14) : props.cid}
    </ExternalTextLink>
  )
}
