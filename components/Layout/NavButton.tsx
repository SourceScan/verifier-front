import { Button, useColorModeValue } from '@chakra-ui/react'

interface NavButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  width?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

export default function NavButton(props: NavButtonProps) {
  return (
    <Button
      onClick={props.onClick}
      aria-label={props.className}
      className={props.className}
      disabled={props.disabled}
      type={props.type}
      variant={props.variant}
      bg={'transparent'}
      _hover={{
        base: { bg: 'none' },
        md: { bg: useColorModeValue('blackAlpha.200', 'whiteAlpha.200') },
      }}
      rounded={'full'}
      fontSize={'lg'}
    >
      {props.children}
    </Button>
  )
}
