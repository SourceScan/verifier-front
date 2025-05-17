import { useNetwork } from '@/contexts/NetworkContext'
import { Box, Text, Tooltip } from '@chakra-ui/react'
import React from 'react'

interface NetworkBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const NetworkBadge: React.FC<NetworkBadgeProps> = ({
  size = 'md',
  showLabel = true,
}) => {
  const { networkConfig } = useNetwork()

  // Size configurations
  const sizeConfig = {
    sm: {
      badgeSize: '8px',
      fontSize: '10px',
      padding: '2px 6px',
    },
    md: {
      badgeSize: '10px',
      fontSize: '12px',
      padding: '3px 8px',
    },
    lg: {
      badgeSize: '12px',
      fontSize: '14px',
      padding: '4px 10px',
    },
  }

  const { badgeSize, fontSize, padding } = sizeConfig[size]

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
      >
        <Box
          w={badgeSize}
          h={badgeSize}
          rounded="full"
          bg="currentColor"
          opacity={0.7}
          mr={showLabel ? 1.5 : 0}
        />
        {showLabel && (
          <Text fontSize={fontSize} lineHeight="1.2">
            {networkConfig.name}
          </Text>
        )}
      </Box>
    </Tooltip>
  )
}

export default NetworkBadge
