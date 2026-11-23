import Footer from './Footer'
import Navbar from './Navbar'
import { Box, Flex, SkipNavContent, SkipNavLink } from '@chakra-ui/react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout(props: LayoutProps) {
  return (
    <Flex direction="column" minH="100vh">
      <SkipNavLink bg="surface" color="ink">
        Skip to content
      </SkipNavLink>
      <Navbar />
      <Box as="main" flex="1">
        <SkipNavContent />
        {props.children}
      </Box>
      <Footer />
    </Flex>
  )
}
