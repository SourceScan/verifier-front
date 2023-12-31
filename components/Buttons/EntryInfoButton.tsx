import { ArrowForwardIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Box,
  Collapse,
  HStack,
  List,
  ListIcon,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'

import DefaultTooltip from '../Common/DefaultTooltip'

export default function EntryInfoButton(props: { display?: string }) {
  const { isOpen, onToggle } = useDisclosure()

  return (
    <>
      <DefaultTooltip
        label={'About entrypoints'}
        placement={'top'}
        display={props.display}
      >
        <WarningIcon
          onClick={onToggle}
          rounded={'full'}
          color={useColorModeValue('yellow.600', 'yellow.100')}
          boxSize={'24px'}
          display={props.display}
        />
      </DefaultTooltip>
      <Collapse in={isOpen} animateOpacity>
        <Box w={'300px'} textAlign={'left'}>
          <List spacing={3}>
            <HStack>
              <ListIcon as={ArrowForwardIcon} />
              <Text>
                If you are building rust, the entry point should be Cargo.toml
                file
              </Text>
            </HStack>
            <HStack>
              <ListIcon as={ArrowForwardIcon} />
              <Text>
                If you are building ts, the entry point should be package.json
                file
              </Text>
            </HStack>
          </List>
        </Box>
      </Collapse>
    </>
  )
}
