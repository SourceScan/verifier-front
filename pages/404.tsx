import PageHead from '@/components/Common/PageHead'
import StatePanel from '@/components/Common/StatePanel'
import { Button, Container } from '@chakra-ui/react'
import NextLink from 'next/link'

export default function FourOhFour() {
  return (
    <>
      <PageHead title="Page not found on SourceScan" />
      <Container maxW="720px" px={{ base: 4, md: 8 }} py={{ base: 10, md: 16 }}>
        <StatePanel
          tone="empty"
          title="Page not found"
          action={
            <Button as={NextLink} href="/" variant="quiet">
              Back to verified contracts
            </Button>
          }
        >
          This address doesn't match any SourceScan page. Contract pages live at /contract/&lt;account-id&gt;.
        </StatePanel>
      </Container>
    </>
  )
}
