import { Container, useColorModeValue } from '@chakra-ui/react'

interface NavContainerProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  width?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function NavContainer(props: NavContainerProps) {
  return (
    <Container
      onClick={props.onClick}
      className={props.className}
      width={props.width}
      bg={'transparent'}
      _hover={{
        base: { bg: 'none' },
        md: { bg: useColorModeValue('blackAlpha.200', 'whiteAlpha.200') },
      }}
      rounded={'full'}
    >
      {props.children}
    </Container>
  )
}
