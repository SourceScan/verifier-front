import { bg, color } from '@/utils/theme'
import {
  Box,
  Skeleton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorMode,
} from '@chakra-ui/react'

export default function ContractsTableSkeleton({
  count = 5,
}: {
  count?: number
}) {
  const { colorMode } = useColorMode()

  return (
    <TableContainer
      borderColor={'gray.500'}
      borderWidth={'1px'}
      rounded={'lg'}
      display={{
        base: 'none',
        md: 'flex',
      }}
      width="100%"
      maxWidth="1200px"
    >
      <Table variant={'simple'} size={{ md: 'md' }}>
        <Thead>
          <Tr>
            <Th width="30%" textAlign="left">
              Contract
            </Th>
            <Th width="15%" textAlign="left">
              Block Height
            </Th>
            <Th width="15%" textAlign="left">
              Code Hash
            </Th>
            <Th width="15%" textAlign="left">
              IPFS
            </Th>
            <Th width="10%" textAlign="left">
              Approved
            </Th>
            <Th width="15%" textAlign="left">
              Actions
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: count }).map((_, i) => (
            <Tr key={`skeleton-${i}`}>
              <Td>
                <Skeleton
                  height="20px"
                  width="80%"
                  startColor={colorMode === 'dark' ? color.dark : color.light}
                  endColor={colorMode === 'dark' ? bg.dark : bg.light}
                />
              </Td>
              <Td>
                <Skeleton
                  height="20px"
                  width="70%"
                  startColor={colorMode === 'dark' ? color.dark : color.light}
                  endColor={colorMode === 'dark' ? bg.dark : bg.light}
                />
              </Td>
              <Td>
                <Skeleton
                  height="20px"
                  width="60%"
                  startColor={colorMode === 'dark' ? color.dark : color.light}
                  endColor={colorMode === 'dark' ? bg.dark : bg.light}
                />
              </Td>
              <Td>
                <Skeleton
                  height="20px"
                  width="90%"
                  startColor={colorMode === 'dark' ? color.dark : color.light}
                  endColor={colorMode === 'dark' ? bg.dark : bg.light}
                />
              </Td>
              <Td>
                <Skeleton
                  height="20px"
                  width="24px"
                  startColor={colorMode === 'dark' ? color.dark : color.light}
                  endColor={colorMode === 'dark' ? bg.dark : bg.light}
                />
              </Td>
              <Td>
                <Box display="flex" gap={2}>
                  <Skeleton
                    height="28px"
                    width="60px"
                    startColor={colorMode === 'dark' ? color.dark : color.light}
                    endColor={colorMode === 'dark' ? bg.dark : bg.light}
                    borderRadius="md"
                  />
                  <Skeleton
                    height="28px"
                    width="60px"
                    startColor={colorMode === 'dark' ? color.dark : color.light}
                    endColor={colorMode === 'dark' ? bg.dark : bg.light}
                    borderRadius="md"
                  />
                </Box>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}
