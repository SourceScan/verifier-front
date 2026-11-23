import { Button, Flex, HStack, Text } from '@chakra-ui/react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const SPAN = 5

/** Up to five page numbers centred on the current page. */
export function pageWindow(page: number, pages: number): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(SPAN / 2), pages - SPAN + 1))
  const end = Math.min(pages, start + SPAN - 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export default function Pagination(props: { page: number; pages: number; onChange: (_page: number) => void }) {
  const { page, pages, onChange } = props
  if (pages <= 1) return null
  return (
    <Flex as="nav" aria-label="Registry pages" align="center" justify={{ base: 'center', sm: 'space-between' }} gap={3} mt={4} wrap="wrap">
      <Text fontSize="sm" color="muted" display={{ base: 'none', sm: 'block' }}>
        Page {page} of {pages}
      </Text>
      <HStack spacing={1}>
        <Button size="sm" variant="quiet" leftIcon={<FiChevronLeft />} aria-label="Previous page" isDisabled={page <= 1} onClick={() => onChange(page - 1)}>
          <Text as="span" display={{ base: 'none', sm: 'inline' }}>Previous</Text>
        </Button>
        {pageWindow(page, pages).map((p) => (
          <Button key={p} size="sm" minW="32px" px={2} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined} variant={p === page ? 'brand' : 'ghost'} fontFamily="mono" onClick={() => p !== page && onChange(p)}>
            {p}
          </Button>
        ))}
        <Button size="sm" variant="quiet" rightIcon={<FiChevronRight />} aria-label="Next page" isDisabled={page >= pages} onClick={() => onChange(page + 1)}>
          <Text as="span" display={{ base: 'none', sm: 'inline' }}>Next</Text>
        </Button>
      </HStack>
    </Flex>
  )
}
