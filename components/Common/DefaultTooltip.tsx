import {
  PlacementWithLogical,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { ReactNode } from 'react'

export default function DefaultTooltip(props: {
  label: string
  placement: PlacementWithLogical
  children: ReactNode
  display?: string
}) {
  return (
    <Tooltip
      label={props.label}
      placement={props.placement || 'top'}
      rounded={'full'}
      userSelect={'none'}
      bg={useColorModeValue('black', 'white')}
      display={props.display}
    >
      {props.children}
    </Tooltip>
  )
}
