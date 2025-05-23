import { useNetwork } from '@/contexts/NetworkContext'
import { Box, Text, Tooltip, useBreakpointValue } from '@chakra-ui/react'
import React from 'react'

interface NetworkBadgeProps {
  size?:
    | 'sm'
    | 'md'
    | 'lg'
    | { base?: 'sm' | 'md' | 'lg'; md?: 'sm' | 'md' | 'lg' }
  showLabel?: boolean | { base?: boolean; md?: boolean }
}

const NetworkBadge: React.FC<NetworkBadgeProps> = ({
  size = 'md',
  showLabel = true,
}) => {
  const { networkConfig } = useNetwork()
  const [isClient, setIsClient] = React.useState(false)

  // Only show actual network data after component is mounted on the client
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  // Size configurations
  const sizeConfig = {
    sm: {
      badgeSize: '8px',
      fontSize: '10px',
      padding: '2px 6px',
      spacing: '1.5px',
    },
    md: {
      badgeSize: '10px',
      fontSize: '12px',
      padding: '3px 8px',
      spacing: '2px',
    },
    lg: {
      badgeSize: '12px',
      fontSize: '14px',
      padding: '4px 10px',
      spacing: '3px',
    },
  }

  // Handle responsive values
  const resolvedSize =
    useBreakpointValue(typeof size === 'object' ? size : { base: size }) || 'md'

  const resolvedShowLabel =
    useBreakpointValue(
      typeof showLabel === 'object' ? showLabel : { base: showLabel }
    ) ?? true

  const { badgeSize, fontSize, padding, spacing } = sizeConfig[resolvedSize]

  return (
    <Tooltip label={`${networkConfig.name} Network`} hasArrow placement="top">
      <Box
        display="inline-flex"
        alignItems="center"
        rounded="full"
        bg={networkConfig.backgroundColor}
        color={networkConfig.textColor}
        px={2}
        py={1}
        ml={1}
        fontWeight="medium"
        fontSize={fontSize}
        lineHeight="1.2"
        padding={padding}
        // Set fixed height and width based on size to prevent layout shifts
        height={
          resolvedSize === 'sm'
            ? '20px'
            : resolvedSize === 'md'
            ? '24px'
            : '28px'
        }
        minWidth={
          resolvedShowLabel
            ? resolvedSize === 'sm'
              ? '60px'
              : resolvedSize === 'md'
              ? '70px'
              : '80px'
            : 'auto'
        }
        // Add a smooth transition to make any changes less jarring
        transition="all 0.2s ease"
        // Ensure consistent vertical alignment
        verticalAlign="middle"
      >
        <Box
          w={badgeSize}
          h={badgeSize}
          rounded="full"
          bg="currentColor"
          opacity={0.7}
          mr={resolvedShowLabel ? spacing : 0}
          // Make this element fixed size as well
          flexShrink={0}
        />
        {resolvedShowLabel && (
          <Text fontSize={fontSize} lineHeight="1.2" whiteSpace="nowrap">
            {isClient ? networkConfig.name : 'Testnet'}
          </Text>
        )}
      </Box>
    </Tooltip>
  )
}

export default NetworkBadge
