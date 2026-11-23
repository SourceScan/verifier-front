import { IconButton, Tooltip, useClipboard } from '@chakra-ui/react'
import { FiCheck, FiCopy } from 'react-icons/fi'

export default function CopyButton(props: { value: string; label: string }) {
  const { hasCopied, onCopy } = useClipboard(props.value)
  return (
    <Tooltip label={hasCopied ? 'Copied' : props.label} placement="top">
      <IconButton
        aria-label={hasCopied ? 'Copied' : props.label}
        icon={hasCopied ? <FiCheck /> : <FiCopy />}
        size="xs"
        variant="ghost"
        color={hasCopied ? 'status.ok' : 'muted'}
        onClick={onCopy}
      />
    </Tooltip>
  )
}
